import crypto from 'crypto';
import PDFDocument from 'pdfkit';
import { IAgency } from '../models/Agency';
import { BRAND } from '../config/brand';
import { fetchImageBuffer } from '../utils/fetchImage';

// ─── Traveller manifest ───────────────────────────────────────────────────────
// The formal list an agency hands to an embassy, airline, Saudi ground agent or
// partner company: one row per traveller with the details those offices check.
// Landscape A4, so passport-style detail fits without cramping.

export interface ManifestRow {
  name: string;
  passportNumber: string;
  gender?: string;
  dateOfBirth?: Date | string;
  nationality?: string;
  passportExpiry?: Date | string;
  /** Visa number for a visa, ticket number / PNR for a ticket. */
  documentNumber?: string;
  purpose?: string;
  issueDate?: Date | string;
  phone?: string;
  remarks?: string;
}

export interface ManifestMeta {
  /** Headline, e.g. "VISA MANIFEST", "UMRAH PILGRIM MANIFEST". */
  title?: string;
  /** What the list is for — a group or season name. */
  groupName?: string;
  groupNumber?: string;
  partnerCompany?: string;
  destination?: string;
  travelDate?: Date | string;
  returnDate?: Date | string;
  airline?: string;
  /** Column heading for documentNumber — "Visa Number" or "Ticket Number". */
  numberLabel?: string;
  /** Any further label/value pairs for the details panel (hotels, flight…). */
  extraDetails?: Array<{ label: string; value?: string }>;
  /** Printed reference; generated when absent. */
  reference?: string;
  preparedBy?: string;
}

const PAGE_W = 841.89;
const PAGE_H = 595.28;
const M = 34;
const W = PAGE_W - M * 2;
const ROW_H = 20;
const TABLE_BOTTOM = PAGE_H - 52; // last y a row may end at
const FOOTER_Y = PAGE_H - 30;

const INK = '#0f172a';
const BODY = '#334155';
const MUTED = '#64748b';
const FAINT = '#94a3b8';
const HAIRLINE = '#e2e8f0';

/** Mix a hex colour towards white (ratio 1 = white). */
function tint(hex: string, ratio: number): string {
  const h = hex.replace('#', '');
  const mix = (i: number) => Math.round(parseInt(h.slice(i, i + 2), 16) * (1 - ratio) + 255 * ratio);
  return `#${[0, 2, 4].map((i) => mix(i).toString(16).padStart(2, '0')).join('')}`;
}

/** Mix a hex colour towards black (ratio 1 = black). */
function shade(hex: string, ratio: number): string {
  const h = hex.replace('#', '');
  const mix = (i: number) => Math.round(parseInt(h.slice(i, i + 2), 16) * (1 - ratio));
  return `#${[0, 2, 4].map((i) => mix(i).toString(16).padStart(2, '0')).join('')}`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "05 Sep 2029" — spelled out so day/month order is never ambiguous abroad. */
function fmtDate(d?: Date | string): string {
  if (!d) return '';
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return '';
  return `${String(date.getUTCDate()).padStart(2, '0')} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

function genderLabel(g?: string): string {
  if (!g) return '';
  const v = g.toLowerCase();
  if (v.startsWith('m')) return 'M';
  if (v.startsWith('f')) return 'F';
  return g.slice(0, 1).toUpperCase();
}

interface Column {
  key: string;
  label: string;
  /** Relative width; columns are scaled to fill the page. */
  width: number;
  align?: 'left' | 'center';
  bold?: boolean;
  value: (r: ManifestRow, i: number) => string;
  /** Always shown, even when every row is empty. */
  core?: boolean;
}

function buildColumns(rows: ManifestRow[], numberLabel: string): Column[] {
  const all: Column[] = [
    { key: 'sn', label: 'S/N', width: 26, align: 'center', core: true, value: (_r, i) => String(i + 1) },
    { key: 'name', label: 'Full name (as in passport)', width: 178, bold: true, core: true, value: (r) => (r.name || '').toUpperCase() },
    { key: 'gender', label: 'Sex', width: 30, align: 'center', value: (r) => genderLabel(r.gender) },
    { key: 'dob', label: 'DOB', width: 66, value: (r) => fmtDate(r.dateOfBirth) },
    { key: 'nationality', label: 'Nationality', width: 72, value: (r) => r.nationality || '' },
    { key: 'passport', label: 'Passport no.', width: 76, bold: true, core: true, value: (r) => (r.passportNumber || '').toUpperCase() },
    { key: 'expiry', label: 'Expiry date', width: 68, value: (r) => fmtDate(r.passportExpiry) },
    { key: 'doc', label: numberLabel, width: 92, bold: true, value: (r) => r.documentNumber || '' },
    { key: 'purpose', label: 'Purpose', width: 78, value: (r) => r.purpose || '' },
    { key: 'issued', label: 'Issued', width: 64, value: (r) => fmtDate(r.issueDate) },
    { key: 'phone', label: 'Phone', width: 82, value: (r) => r.phone || '' },
    { key: 'remarks', label: 'Remarks', width: 96, value: (r) => r.remarks || '' },
  ];
  // Hide a column nobody has data for, so batches from partners (name and
  // passport only) don't print a page of empty boxes.
  const shown = all.filter((c) => c.core || rows.some((r, i) => c.value(r, i).trim() !== ''));
  const total = shown.reduce((s, c) => s + c.width, 0);
  return shown.map((c) => ({ ...c, width: (c.width / total) * W }));
}

export async function generateManifestPDF(agency: IAgency, rows: ManifestRow[], meta: ManifestMeta = {}): Promise<Buffer> {
  const brand = BRAND;
  const companyName: string = (agency as any).branding?.companyName || agency.name || 'Travel Agency';
  const logoUrl: string | undefined = (agency as any).branding?.logoUrl || agency.logo;
  const rcNumber: string | undefined = (agency as any).rcNumber;
  const title = (meta.title || 'VISA MANIFEST').toUpperCase();
  const numberLabel = meta.numberLabel || 'Visa number';
  const today = new Date();
  const reference =
    meta.reference ||
    `MAN-${today.toISOString().slice(0, 10).replace(/-/g, '')}-${crypto.randomInt(1000, 10000)}`;

  // Fetch the logo before drawing; a missing or slow logo just means no logo.
  let logo: Buffer | null = null;
  if (logoUrl) {
    try { logo = await fetchImageBuffer(logoUrl); } catch { logo = null; }
  }

  const doc = new PDFDocument({
    size: 'A4',
    layout: 'landscape',
    margins: { top: 0, bottom: 0, left: 0, right: 0 },
    bufferPages: true,
    info: { Title: `${title} — ${meta.groupName || companyName}`, Author: companyName, Subject: reference },
  });
  /**
   * Shortens text to fit a width in the current font. PDFKit's own ellipsis
   * still wraps when lineBreak is off, which spills long names into the next row.
   */
  function fit(text: string, width: number): string {
    if (!text || doc.widthOfString(text) <= width) return text;
    let t = text;
    while (t.length > 1 && doc.widthOfString(`${t}…`) > width) t = t.slice(0, -1);
    return `${t.trimEnd()}…`;
  }

  const chunks: Buffer[] = [];
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });

  const columns = buildColumns(rows, numberLabel);
  const males = rows.filter((r) => genderLabel(r.gender) === 'M').length;
  const females = rows.filter((r) => genderLabel(r.gender) === 'F').length;
  const contact = [agency.address, agency.phone, agency.email].filter(Boolean).join('   ·   ');

  let y = 0;

  // ── Letterhead (first page) ──────────────────────────────────────────────────
  function drawLetterhead() {
    doc.rect(0, 0, PAGE_W, 4).fill(brand);

    let textX = M;
    if (logo) {
      try {
        doc.image(logo, M, 20, { fit: [48, 48], valign: 'center' });
        textX = M + 60;
      } catch { /* unsupported image format — carry on without it */ }
    }
    doc.font('Helvetica-Bold').fontSize(15).fillColor(INK);
    doc.text(fit(companyName, 380), textX, 24, { width: 380, lineBreak: false });
    if (contact) {
      doc.font('Helvetica').fontSize(8).fillColor(MUTED);
      doc.text(fit(contact, 400), textX, 44, { width: 400, lineBreak: false });
    }
    if (rcNumber) {
      doc.font('Helvetica').fontSize(8).fillColor(MUTED).text(`RC ${rcNumber}`, textX, 56, { width: 400, lineBreak: false });
    }

    // Title block, right aligned.
    doc.font('Helvetica-Bold').fontSize(17).fillColor(brand)
      .text(title, PAGE_W - M - 330, 22, { width: 330, align: 'right', characterSpacing: 0.6, lineBreak: false });
    doc.font('Helvetica').fontSize(8).fillColor(MUTED)
      .text(`Ref: ${reference}`, PAGE_W - M - 330, 44, { width: 330, align: 'right', lineBreak: false })
      .text(`Prepared: ${fmtDate(today)}`, PAGE_W - M - 330, 56, { width: 330, align: 'right', lineBreak: false });

    y = 80;
    doc.moveTo(M, y).lineTo(PAGE_W - M, y).lineWidth(1.2).strokeColor(brand).stroke();
    y += 12;
  }

  // ── Details panel ────────────────────────────────────────────────────────────
  function drawDetails() {
    const travellers = `${rows.length}${males || females ? `  (${males} male, ${females} female)` : ''}`;
    const cells = [
      meta.groupName && { label: 'Group / season', value: meta.groupName },
      meta.groupNumber && { label: 'Group no.', value: meta.groupNumber },
      meta.partnerCompany && { label: 'Prepared for', value: meta.partnerCompany },
      meta.destination && { label: 'Destination', value: meta.destination },
      meta.travelDate && { label: 'Departure', value: fmtDate(meta.travelDate) },
      meta.returnDate && { label: 'Return', value: fmtDate(meta.returnDate) },
      meta.airline && { label: 'Airline', value: meta.airline },
      ...(meta.extraDetails || []).filter((d) => d.value),
      { label: 'Total travellers', value: travellers },
    ].filter(Boolean) as Array<{ label: string; value: string }>;

    const perRow = 4;
    const cellW = W / perRow;
    const cellH = 32;
    const lines = Math.ceil(cells.length / perRow);
    const boxH = lines * cellH;

    doc.roundedRect(M, y, W, boxH, 4).fillAndStroke(tint(brand, 0.96), tint(brand, 0.8));
    cells.forEach((c, i) => {
      const cx = M + (i % perRow) * cellW;
      const cy = y + Math.floor(i / perRow) * cellH;
      if (i % perRow > 0) doc.moveTo(cx, cy + 6).lineTo(cx, cy + cellH - 6).lineWidth(0.5).strokeColor(tint(brand, 0.8)).stroke();
      if (i >= perRow && i % perRow === 0) doc.moveTo(M + 8, cy).lineTo(M + W - 8, cy).lineWidth(0.5).strokeColor(tint(brand, 0.85)).stroke();
      doc.font('Helvetica').fontSize(6.8).fillColor(MUTED)
        .text(c.label.toUpperCase(), cx + 10, cy + 7, { width: cellW - 20, characterSpacing: 0.5, lineBreak: false });
      doc.font('Helvetica-Bold').fontSize(9.5).fillColor(INK);
      doc.text(fit(c.value, cellW - 20), cx + 10, cy + 17, { width: cellW - 20, lineBreak: false });
    });
    y += boxH + 14;
  }

  // ── Table ────────────────────────────────────────────────────────────────────
  function drawTableHeader() {
    const h = 22;
    doc.rect(M, y, W, h).fill(shade(brand, 0.15));
    let x = M;
    doc.font('Helvetica-Bold').fontSize(7).fillColor('#ffffff');
    for (const c of columns) {
      doc.text(fit(c.label.toUpperCase(), c.width - 12), x + 5, y + 8, {
        width: c.width - 10, align: c.align || 'left', characterSpacing: 0.3, lineBreak: false,
      });
      x += c.width;
    }
    y += h;
  }

  /** Later pages carry a compact header so a loose page still says whose list it is. */
  function startContinuationPage() {
    doc.addPage();
    doc.rect(0, 0, PAGE_W, 4).fill(brand);
    doc.font('Helvetica-Bold').fontSize(9).fillColor(INK)
      .text(companyName, M, 18, { width: W / 2, lineBreak: false, ellipsis: true });
    doc.font('Helvetica').fontSize(8).fillColor(MUTED)
      .text(`${title}${meta.groupName ? ` — ${meta.groupName}` : ''} (continued)`, M + W / 2, 19, {
        width: W / 2, align: 'right', lineBreak: false, ellipsis: true,
      });
    y = 38;
    drawTableHeader();
  }

  function drawRow(r: ManifestRow, i: number) {
    if (i % 2 === 1) doc.rect(M, y, W, ROW_H).fill(tint(brand, 0.97));
    let x = M;
    for (const c of columns) {
      const v = c.value(r, i);
      if (c.key === 'sn') doc.font('Helvetica').fontSize(8).fillColor(FAINT);
      else if (c.bold) doc.font('Helvetica-Bold').fontSize(8.5).fillColor(INK);
      else doc.font('Helvetica').fontSize(8.5).fillColor(BODY);
      doc.text(fit(v || '—', c.width - 10), x + 5, y + 6.5, {
        width: c.width - 10, align: c.align || 'left', lineBreak: false,
      });
      x += c.width;
    }
    y += ROW_H;
    doc.moveTo(M, y).lineTo(M + W, y).lineWidth(0.4).strokeColor(HAIRLINE).stroke();
  }

  // ── Certification & signatures ───────────────────────────────────────────────
  function drawCertification() {
    const needed = 108;
    if (y + needed > TABLE_BOTTOM) {
      doc.addPage();
      doc.rect(0, 0, PAGE_W, 4).fill(brand);
      y = 40;
    }
    y += 16;
    const total = `${rows.length} traveller${rows.length === 1 ? '' : 's'}`;
    doc.font('Helvetica').fontSize(8.5).fillColor(BODY)
      .text(
        `We certify that the ${total} listed above ${rows.length === 1 ? 'is' : 'are'} registered with ${companyName}` +
          `${meta.groupName ? ` under ${meta.groupName}` : ''}, and that the details shown were recorded from their travel documents.`,
        M, y, { width: W }
      );
    y = doc.y + 30;

    const slots = ['Prepared by', 'Checked by', 'Authorised signatory & stamp'];
    const slotW = 210;
    const gap = (W - slotW * slots.length) / (slots.length - 1);
    slots.forEach((label, i) => {
      const x = M + i * (slotW + gap);
      doc.moveTo(x, y).lineTo(x + slotW, y).lineWidth(0.7).strokeColor('#cbd5e1').stroke();
      doc.font('Helvetica-Bold').fontSize(8).fillColor(INK).text(label, x, y + 6, { width: slotW, lineBreak: false });
      const caption = i === 0 && meta.preparedBy ? meta.preparedBy : 'Name, signature & date';
      doc.font('Helvetica').fontSize(7.5).fillColor(MUTED).text(caption, x, y + 18, { width: slotW, lineBreak: false });
    });
    y += 30;
  }

  // ── Compose ──────────────────────────────────────────────────────────────────
  drawLetterhead();
  drawDetails();
  drawTableHeader();
  if (!rows.length) {
    doc.font('Helvetica').fontSize(9).fillColor(MUTED).text('No travellers on this list.', M, y + 12, { width: W, align: 'center' });
    y += 36;
  }
  rows.forEach((r, i) => {
    if (y + ROW_H > TABLE_BOTTOM) startContinuationPage();
    drawRow(r, i);
  });
  drawCertification();

  // Footer on every page, once the page count is known.
  const range = doc.bufferedPageRange();
  const footerLeft = [companyName, rcNumber && `RC ${rcNumber}`, agency.phone].filter(Boolean).join('  ·  ');
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    doc.moveTo(M, FOOTER_Y - 8).lineTo(PAGE_W - M, FOOTER_Y - 8).lineWidth(0.4).strokeColor(HAIRLINE).stroke();
    doc.font('Helvetica').fontSize(7).fillColor(FAINT)
      .text(footerLeft, M, FOOTER_Y, { width: W / 3, lineBreak: false, ellipsis: true })
      .text('Confidential — contains personal passport data', M + W / 3, FOOTER_Y, { width: W / 3, align: 'center', lineBreak: false })
      .text(`${reference}   ·   Page ${i - range.start + 1} of ${range.count}`, M + (2 * W) / 3, FOOTER_Y, {
        width: W / 3, align: 'right', lineBreak: false,
      });
  }

  doc.end();
  return done;
}

/** Earlier name, kept so existing callers keep working. */
export const generateVisaBatchPDF = generateManifestPDF;
