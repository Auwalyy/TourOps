import PDFDocument from 'pdfkit';
import { IInvoice } from '../models/Invoice';
import { IReceipt } from '../models/Receipt';
import { IAgency } from '../models/Agency';
import { IPayment } from '../models/Payment';
import { IVisaApplication } from '../models/VisaApplication';
import https from 'https';
import http from 'http';

// Fetch remote image buffer (for logo)
function fetchImageBuffer(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

function fmt(amount: number, currency: string) {
  return `${currency} ${amount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function drawHRule(doc: PDFKit.PDFDocument, y: number, color = '#e5e7eb') {
  doc.moveTo(50, y).lineTo(545, y).strokeColor(color).lineWidth(0.5).stroke();
}

async function drawHeader(doc: PDFKit.PDFDocument, agency: IAgency, docType: 'INVOICE' | 'RECEIPT', refNumber: string, date: string, dueDate?: string) {
  const primaryColor = (agency as any).branding?.primaryColor || '#0d6e52';
  const companyName = (agency as any).branding?.companyName || agency.name;
  const logoUrl = (agency as any).branding?.logoUrl || agency.logo;

  // Top color bar
  doc.rect(0, 0, 595, 8).fill(primaryColor);

  // Logo
  let logoX = 50;
  if (logoUrl) {
    try {
      const imgBuf = await fetchImageBuffer(logoUrl);
      doc.image(imgBuf, 50, 20, { height: 50, fit: [120, 50] });
      logoX = 180;
    } catch { /* skip logo if fetch fails */ }
  }

  // Company name & details (left)
  doc.fontSize(13).font('Helvetica-Bold').fillColor('#111827').text(companyName, logoX, 22, { width: 250 });
  doc.fontSize(8).font('Helvetica').fillColor('#6b7280');
  let infoY = 38;
  if (agency.address) { doc.text(agency.address, logoX, infoY, { width: 250 }); infoY += 11; }
  if (agency.phone) { doc.text(`Tel: ${agency.phone}`, logoX, infoY, { width: 250 }); infoY += 11; }
  if (agency.email) { doc.text(agency.email, logoX, infoY, { width: 250 }); infoY += 11; }
  if ((agency as any).rcNumber) { doc.text(`RC No: ${(agency as any).rcNumber}`, logoX, infoY, { width: 250 }); infoY += 11; }
  if (agency.website) { doc.text(agency.website, logoX, infoY, { width: 250 }); }

  // Doc type badge (right)
  doc.rect(390, 18, 155, 40).fill(primaryColor);
  doc.fontSize(20).font('Helvetica-Bold').fillColor('#ffffff').text(docType, 395, 26, { width: 145, align: 'center' });

  // Ref & date block (right)
  doc.fontSize(8).font('Helvetica').fillColor('#374151');
  doc.text(`${docType === 'INVOICE' ? 'Invoice' : 'Receipt'} #:`, 390, 68);
  doc.font('Helvetica-Bold').text(refNumber, 460, 68);
  doc.font('Helvetica').text('Date:', 390, 80);
  doc.font('Helvetica-Bold').text(date, 460, 80);
  if (dueDate) {
    doc.font('Helvetica').fillColor('#dc2626').text('Due Date:', 390, 92);
    doc.font('Helvetica-Bold').text(dueDate, 460, 92);
  }

  drawHRule(doc, 115, primaryColor);
}

// ─── INVOICE PDF ──────────────────────────────────────────────────────────────
export async function generateInvoicePDF(invoice: IInvoice, agency: IAgency): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks: Buffer[] = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const primaryColor = (agency as any).branding?.primaryColor || '#0d6e52';
    const customer = (invoice as any).customerId as any;

    await drawHeader(
      doc, agency, 'INVOICE', invoice.invoiceNumber,
      new Date(invoice.issuedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : undefined
    );

    // Bill To
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#6b7280').text('BILL TO', 50, 128);
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#111827');
    const customerName = customer?.fullName || (customer ? `${customer.firstName} ${customer.lastName}` : 'Customer');
    doc.text(customerName, 50, 140);
    doc.fontSize(9).font('Helvetica').fillColor('#6b7280');
    if (customer?.email) doc.text(customer.email, 50, 153);
    if (customer?.phone) doc.text(customer.phone, 50, 164);

    // Status badge
    const statusColors: Record<string, string> = {
      paid: '#059669', partially_paid: '#d97706', overdue: '#dc2626',
      sent: '#0d6e52', draft: '#6b7280', cancelled: '#9ca3af',
    };
    const statusColor = statusColors[invoice.status] || '#6b7280';
    doc.roundedRect(390, 128, 155, 22, 4).fill(statusColor);
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#ffffff')
      .text(invoice.status.replace(/_/g, ' ').toUpperCase(), 390, 134, { width: 155, align: 'center' });

    // Line items table header
    let y = 195;
    doc.rect(50, y, 495, 22).fill(primaryColor);
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#ffffff');
    doc.text('DESCRIPTION', 58, y + 7);
    doc.text('QTY', 340, y + 7, { width: 40, align: 'right' });
    doc.text('UNIT PRICE', 385, y + 7, { width: 80, align: 'right' });
    doc.text('TOTAL', 470, y + 7, { width: 70, align: 'right' });
    y += 22;

    // Line items
    invoice.lineItems.forEach((item, i) => {
      if (i % 2 === 0) doc.rect(50, y, 495, 22).fill('#f9fafb');
      doc.fontSize(9).font('Helvetica').fillColor('#111827');
      doc.text(item.description, 58, y + 6, { width: 275 });
      doc.text(String(item.quantity), 340, y + 6, { width: 40, align: 'right' });
      doc.text(fmt(item.unitPrice, invoice.currency), 385, y + 6, { width: 80, align: 'right' });
      doc.font('Helvetica-Bold').text(fmt(item.total, invoice.currency), 470, y + 6, { width: 70, align: 'right' });
      y += 22;
    });

    drawHRule(doc, y + 5);
    y += 18;

    // Totals block
    const totals: Array<{ label: string; value: string; bold?: boolean; color?: string }> = [
      { label: 'Subtotal', value: fmt(invoice.subtotal, invoice.currency) },
    ];
    if (invoice.discount > 0) totals.push({ label: 'Discount', value: `- ${fmt(invoice.discount, invoice.currency)}`, color: '#059669' });
    if (invoice.tax > 0) totals.push({ label: `Tax (${invoice.taxRate}%)`, value: fmt(invoice.tax, invoice.currency) });
    totals.push({ label: 'TOTAL', value: fmt(invoice.totalAmount, invoice.currency), bold: true });
    totals.push({ label: 'Amount Paid', value: fmt(invoice.amountPaid, invoice.currency), color: '#059669' });
    totals.push({ label: 'Balance Due', value: fmt(invoice.outstandingBalance, invoice.currency), bold: true, color: invoice.outstandingBalance > 0 ? '#dc2626' : '#059669' });

    totals.forEach(({ label, value, bold, color }) => {
      doc.fontSize(9)
        .font(bold ? 'Helvetica-Bold' : 'Helvetica')
        .fillColor(color || '#374151')
        .text(label + ':', 370, y, { width: 100, align: 'right' });
      doc.font(bold ? 'Helvetica-Bold' : 'Helvetica')
        .fillColor(color || '#111827')
        .text(value, 475, y, { width: 65, align: 'right' });
      y += bold ? 16 : 14;
    });

    // Bank details
    const bank = (agency as any).bankDetails;
    if (bank?.accountNumber) {
      y += 10;
      drawHRule(doc, y);
      y += 12;
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#6b7280').text('PAYMENT DETAILS', 50, y);
      y += 12;
      doc.fontSize(9).font('Helvetica').fillColor('#374151');
      if (bank.bankName) { doc.text(`Bank: ${bank.bankName}`, 50, y); y += 13; }
      if (bank.accountName) { doc.text(`Account Name: ${bank.accountName}`, 50, y); y += 13; }
      if (bank.accountNumber) { doc.text(`Account Number: ${bank.accountNumber}`, 50, y); y += 13; }
    }

    // Notes
    if (invoice.notes) {
      y += 10;
      drawHRule(doc, y);
      y += 12;
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#6b7280').text('NOTES', 50, y);
      y += 12;
      doc.fontSize(9).font('Helvetica').fillColor('#374151').text(invoice.notes, 50, y, { width: 495 });
    }

    // Footer
    doc.fontSize(7).font('Helvetica').fillColor('#9ca3af')
      .text(`${(agency as any).branding?.companyName || agency.name} · ${agency.address || ''} · ${agency.phone || ''}`, 50, 780, { align: 'center', width: 495 });

    doc.end();
  });
}

// ─── RECEIPT PDF ──────────────────────────────────────────────────────────────
export async function generateReceiptPDF(invoice: IInvoice, agency: IAgency, payments: IPayment[], singlePaymentId?: string): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks: Buffer[] = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const primaryColor = (agency as any).branding?.primaryColor || '#0d6e52';
    const companyName = (agency as any).branding?.companyName || agency.name;
    const customer = (invoice as any).customerId as any;
    const customerName = customer?.fullName || (customer ? `${customer.firstName} ${customer.lastName}` : 'Customer');

    const receiptNumber = `RCP-${invoice.invoiceNumber}-${singlePaymentId ? singlePaymentId.slice(-6).toUpperCase() : 'ALL'}`;
    const receiptDate = payments.length > 0
      ? new Date(payments[payments.length - 1].paidAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      : new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

    await drawHeader(doc, agency, 'RECEIPT', receiptNumber, receiptDate);

    // Received from block
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#6b7280').text('RECEIVED FROM', 50, 128);
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#111827').text(customerName, 50, 140);
    doc.fontSize(9).font('Helvetica').fillColor('#6b7280');
    if (customer?.email) doc.text(customer.email, 50, 153);
    if (customer?.phone) doc.text(customer.phone, 50, 164);

    // For invoice ref
    doc.fontSize(8).font('Helvetica').fillColor('#6b7280').text('For Invoice:', 390, 128);
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#111827').text(invoice.invoiceNumber, 390, 139);

    // Big amount paid box
    let y = 200;
    const totalReceived = payments.reduce((s, p) => s + p.amount, 0);
    doc.rect(50, y, 495, 60).fill(primaryColor);
    doc.fontSize(11).font('Helvetica').fillColor('rgba(255,255,255,0.7)').text('TOTAL AMOUNT RECEIVED', 50, y + 10, { align: 'center', width: 495 });
    doc.fontSize(26).font('Helvetica-Bold').fillColor('#ffffff')
      .text(fmt(totalReceived, invoice.currency), 50, y + 26, { align: 'center', width: 495 });
    y += 75;

    // Payment breakdown table
    if (payments.length > 0) {
      doc.rect(50, y, 495, 22).fill('#f3f4f6');
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#6b7280');
      doc.text('DATE', 58, y + 7);
      doc.text('METHOD', 200, y + 7);
      doc.text('REFERENCE', 320, y + 7);
      doc.text('AMOUNT', 470, y + 7, { width: 70, align: 'right' });
      y += 22;

      payments.forEach((p, i) => {
        if (i % 2 === 0) doc.rect(50, y, 495, 22).fill('#fafafa');
        doc.fontSize(9).font('Helvetica').fillColor('#374151');
        doc.text(new Date(p.paidAt).toLocaleDateString('en-GB'), 58, y + 6);
        doc.text((p.method || '').replace(/_/g, ' '), 200, y + 6, { width: 110, align: 'left' });
        doc.text(p.reference || '—', 320, y + 6, { width: 145 });
        doc.font('Helvetica-Bold').fillColor('#059669')
          .text(fmt(p.amount, invoice.currency), 470, y + 6, { width: 70, align: 'right' });
        y += 22;
      });
    }

    drawHRule(doc, y + 8);
    y += 20;

    // Invoice summary
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#6b7280').text('INVOICE SUMMARY', 50, y);
    y += 14;
    const summary = [
      { label: 'Invoice Total', value: fmt(invoice.totalAmount, invoice.currency) },
      { label: 'Total Paid', value: fmt(invoice.amountPaid, invoice.currency), color: '#059669' },
      { label: 'Outstanding Balance', value: fmt(invoice.outstandingBalance, invoice.currency), color: invoice.outstandingBalance > 0 ? '#dc2626' : '#059669', bold: true },
    ];
    summary.forEach(({ label, value, color, bold }) => {
      doc.fontSize(9).font(bold ? 'Helvetica-Bold' : 'Helvetica').fillColor(color || '#374151')
        .text(label + ':', 50, y, { width: 200 });
      doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fillColor(color || '#111827')
        .text(value, 250, y);
      y += 15;
    });

    // Bank details
    const bank = (agency as any).bankDetails;
    if (bank?.accountNumber) {
      y += 10;
      drawHRule(doc, y);
      y += 14;
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#6b7280').text('OUR BANK DETAILS', 50, y);
      y += 12;
      doc.fontSize(9).font('Helvetica').fillColor('#374151');
      if (bank.bankName) { doc.text(`Bank: ${bank.bankName}`, 50, y); y += 13; }
      if (bank.accountName) { doc.text(`Account Name: ${bank.accountName}`, 50, y); y += 13; }
      if (bank.accountNumber) { doc.text(`Account Number: ${bank.accountNumber}`, 50, y); y += 13; }
    }

    // Stamp / Thank you
    y += 15;
    drawHRule(doc, y, primaryColor);
    y += 15;
    doc.fontSize(11).font('Helvetica-Bold').fillColor(primaryColor)
      .text('Thank you for your business!', 50, y, { align: 'center', width: 495 });
    if (invoice.outstandingBalance <= 0) {
      y += 18;
      doc.roundedRect(175, y, 245, 30, 4).stroke(primaryColor);
      doc.fontSize(13).font('Helvetica-Bold').fillColor(primaryColor)
        .text('✓  FULLY PAID', 175, y + 8, { align: 'center', width: 245 });
    }

    // Footer
    doc.fontSize(7).font('Helvetica').fillColor('#9ca3af')
      .text(`${companyName} · ${agency.address || ''} · ${agency.phone || ''}${(agency as any).rcNumber ? ` · RC: ${(agency as any).rcNumber}` : ''}`, 50, 780, { align: 'center', width: 495 });

    doc.end();
  });
}

// ─── STANDALONE RECEIPT PDF ───────────────────────────────────────────────────
export async function generateStandaloneReceiptPDF(receipt: IReceipt, agency: IAgency): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks: Buffer[] = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const primaryColor = (agency as any).branding?.primaryColor || '#0d6e52';
    const companyName = (agency as any).branding?.companyName || agency.name;
    const logoUrl = (agency as any).branding?.logoUrl || agency.logo;
    const customer = (receipt as any).customerId as any;
    const customerName = customer?.fullName || (customer ? `${customer.firstName} ${customer.lastName}` : 'Customer');
    const issuedBy = (receipt as any).issuedBy as any;
    const invoice = (receipt as any).invoiceId as any;
    const travelFile = (receipt as any).travelFileId as any;

    // ── Top bar ──
    doc.rect(0, 0, 595, 8).fill(primaryColor);

    // ── Logo ──
    let textStartX = 50;
    if (logoUrl) {
      try {
        const imgBuf = await fetchImageBuffer(logoUrl);
        doc.image(imgBuf, 50, 20, { height: 50, fit: [120, 50] });
        textStartX = 180;
      } catch { /* skip */ }
    }

    // ── Company info ──
    doc.fontSize(13).font('Helvetica-Bold').fillColor('#111827').text(companyName, textStartX, 22, { width: 240 });
    doc.fontSize(8).font('Helvetica').fillColor('#6b7280');
    let cy = 38;
    if (agency.address) { doc.text(agency.address, textStartX, cy, { width: 240 }); cy += 11; }
    if (agency.phone) { doc.text(`Tel: ${agency.phone}`, textStartX, cy, { width: 240 }); cy += 11; }
    if (agency.email) { doc.text(agency.email, textStartX, cy, { width: 240 }); cy += 11; }
    if ((agency as any).rcNumber) { doc.text(`RC No: ${(agency as any).rcNumber}`, textStartX, cy, { width: 240 }); cy += 11; }
    if (agency.website) { doc.text(agency.website, textStartX, cy, { width: 240 }); }

    // ── RECEIPT badge ──
    doc.rect(390, 18, 155, 40).fill(primaryColor);
    doc.fontSize(20).font('Helvetica-Bold').fillColor('#ffffff').text('RECEIPT', 390, 26, { width: 155, align: 'center' });

    // ── Receipt meta ──
    doc.fontSize(8).font('Helvetica').fillColor('#374151');
    doc.text('Receipt No:', 390, 68); doc.font('Helvetica-Bold').text(receipt.receiptNumber, 455, 68);
    doc.font('Helvetica').text('Date:', 390, 80);
    doc.font('Helvetica-Bold').text(new Date(receipt.paidAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }), 455, 80);

    // ── Divider ──
    doc.moveTo(50, 115).lineTo(545, 115).strokeColor(primaryColor).lineWidth(1).stroke();

    // ── Received From ──
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#6b7280').text('RECEIVED FROM', 50, 128);
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#111827').text(customerName, 50, 141);
    doc.fontSize(9).font('Helvetica').fillColor('#6b7280');
    let ry = 155;
    if (customer?.email) { doc.text(customer.email, 50, ry); ry += 12; }
    if (customer?.phone) { doc.text(customer.phone, 50, ry); }

    // ── Ref links (right side) ──
    doc.fontSize(8).font('Helvetica').fillColor('#6b7280');
    if (invoice?.invoiceNumber) {
      doc.text('Invoice Ref:', 390, 128); doc.font('Helvetica-Bold').fillColor('#111827').text(invoice.invoiceNumber, 455, 128);
    }
    if (travelFile?.fileNumber) {
      doc.font('Helvetica').fillColor('#6b7280').text('Travel File:', 390, 141);
      doc.font('Helvetica-Bold').fillColor('#111827').text(travelFile.fileNumber, 455, 141);
    }

    // ── Big amount box ──
    doc.rect(50, 200, 495, 70).fill(primaryColor);
    doc.fontSize(11).font('Helvetica').fillColor('rgba(255,255,255,0.65)').text('AMOUNT RECEIVED', 50, 212, { align: 'center', width: 495 });
    doc.fontSize(30).font('Helvetica-Bold').fillColor('#ffffff')
      .text(fmt(receipt.amount, receipt.currency), 50, 228, { align: 'center', width: 495 });

    // ── Payment details table ──
    let y = 290;
    doc.rect(50, y, 495, 22).fill('#f3f4f6');
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#6b7280');
    doc.text('PAYMENT METHOD', 58, y + 7);
    doc.text('REFERENCE', 230, y + 7);
    doc.text('DATE', 400, y + 7);
    doc.text('AMOUNT', 470, y + 7, { width: 70, align: 'right' });
    y += 22;

    doc.rect(50, y, 495, 24).fill('#fafafa');
    doc.fontSize(10).font('Helvetica').fillColor('#374151');
    doc.text((receipt.method || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()), 58, y + 6);
    doc.text(receipt.reference || '—', 230, y + 6, { width: 165 });
    doc.text(new Date(receipt.paidAt).toLocaleDateString('en-GB'), 400, y + 6);
    doc.font('Helvetica-Bold').fillColor('#059669').text(fmt(receipt.amount, receipt.currency), 470, y + 6, { width: 70, align: 'right' });
    y += 30;

    // ── Description ──
    drawHRule(doc, y + 5);
    y += 18;
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#6b7280').text('DESCRIPTION', 50, y);
    y += 12;
    doc.fontSize(10).font('Helvetica').fillColor('#374151').text(receipt.description, 50, y, { width: 495 });
    y += 20;

    // ── Notes ──
    if (receipt.notes) {
      drawHRule(doc, y + 5);
      y += 18;
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#6b7280').text('NOTES', 50, y);
      y += 12;
      doc.fontSize(9).font('Helvetica').fillColor('#374151').text(receipt.notes, 50, y, { width: 495 });
      y += 20;
    }

    // ── Bank details ──
    const bank = (agency as any).bankDetails;
    if (bank?.accountNumber) {
      drawHRule(doc, y + 5);
      y += 18;
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#6b7280').text('OUR BANK DETAILS', 50, y);
      y += 12;
      doc.fontSize(9).font('Helvetica').fillColor('#374151');
      if (bank.bankName) { doc.text(`Bank: ${bank.bankName}`, 50, y); y += 13; }
      if (bank.accountName) { doc.text(`Account Name: ${bank.accountName}`, 50, y); y += 13; }
      if (bank.accountNumber) { doc.text(`Account Number: ${bank.accountNumber}`, 50, y); y += 13; }
    }

    // ── Issued by ──
    if (issuedBy) {
      y += 5;
      drawHRule(doc, y);
      y += 12;
      doc.fontSize(8).font('Helvetica').fillColor('#9ca3af')
        .text(`Issued by: ${issuedBy.firstName || ''} ${issuedBy.lastName || ''}`.trim(), 50, y);
    }

    // ── Thank you ──
    y += 20;
    drawHRule(doc, y, primaryColor);
    y += 14;
    doc.fontSize(11).font('Helvetica-Bold').fillColor(primaryColor)
      .text('Thank you for your payment!', 50, y, { align: 'center', width: 495 });

    // ── Footer ──
    doc.fontSize(7).font('Helvetica').fillColor('#9ca3af')
      .text(
        `${companyName} · ${agency.address || ''} · ${agency.phone || ''}${(agency as any).rcNumber ? ` · RC: ${(agency as any).rcNumber}` : ''}`,
        50, 780, { align: 'center', width: 495 }
      );

    doc.end();
  });
}



// ─── VISA / TICKET BATCH MANIFEST ───────────────────────────────────────────
export interface ManifestRow {
  passportNumber: string;
  name: string;
  documentNumber?: string;
  purpose?: string;
  issueDate?: Date | string;
}

export interface ManifestMeta {
  /** Group number and travel name, when the batch belongs to a group. */
  groupNumber?: string;
  groupName?: string;
  partnerCompany?: string;
  destination?: string;
  travelDate?: Date | string;
  /** Column heading — "Visa Number" or "Ticket Number". */
  numberLabel?: string;
  /** Headline printed on the cover band. Defaults to "VISA MANIFEST". */
  title?: string;
}

/** Mix a hex colour towards white so a single brand colour yields a whole palette. */
function tint(hex: string, ratio: number): string {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return '#f3f4f6';
  const h = m[1].length === 3 ? m[1].split('').map((c) => c + c).join('') : m[1];
  const mix = (c: number) => Math.round(c + (255 - c) * ratio);
  const parts = [0, 2, 4].map((i) => mix(parseInt(h.slice(i, i + 2), 16)));
  return `#${parts.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

/** Mix a hex colour towards black — used for text that must read on light brand tints. */
function shade(hex: string, ratio: number): string {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return '#111827';
  const h = m[1].length === 3 ? m[1].split('').map((c) => c + c).join('') : m[1];
  const mix = (c: number) => Math.round(c * (1 - ratio));
  const parts = [0, 2, 4].map((i) => mix(parseInt(h.slice(i, i + 2), 16)));
  return `#${parts.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

/**
 * The printable list an agency hands over as proof of a batch of issuances —
 * one row per traveller: passport, name, document number, purpose, issue date.
 */
export async function generateVisaBatchPDF(
  agency: IAgency,
  rows: ManifestRow[],
  meta: ManifestMeta = {}
): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4', bufferPages: true });
    const chunks: Buffer[] = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const brand = (agency as any).branding?.primaryColor || '#0d6e52';
    const companyName = (agency as any).branding?.companyName || agency.name;
    const logoUrl = (agency as any).branding?.logoUrl || agency.logo;
    const printedOn = new Date().toLocaleDateString('en-GB');
    const fmtDate = (d?: Date | string) => (d ? new Date(d).toLocaleDateString('en-GB') : '—');

    const ink = '#0f172a';
    const muted = '#64748b';
    const hairline = '#e8edf2';
    const zebra = tint(brand, 0.965);
    const headline = meta.title || (meta.numberLabel === 'Ticket Number' ? 'TICKET MANIFEST' : 'VISA MANIFEST');

    const M = 40;            // page margin
    const W = 515;           // content width
    const BOTTOM = 762;      // last y at which a table row may start

    // ── Cover band ────────────────────────────────────────────────────────────
    const BAND_H = 118;
    doc.rect(0, 0, 595, BAND_H).fill(brand);

    // Soft decorative discs, clipped to the band.
    doc.save();
    doc.rect(0, 0, 595, BAND_H).clip();
    doc.fillOpacity(0.1);
    doc.circle(548, 14, 78).fill('#ffffff');
    doc.fillOpacity(0.07);
    doc.circle(470, 108, 56).fill('#ffffff');
    doc.fillOpacity(1);
    doc.restore();

    let nameX = M;
    if (logoUrl) {
      try {
        const imgBuf = await fetchImageBuffer(logoUrl);
        doc.roundedRect(M, 26, 52, 52, 8).fill('#ffffff');
        doc.image(imgBuf, M + 6, 32, { fit: [40, 40] });
        nameX = M + 66;
      } catch { /* the band still works without a logo */ }
    }

    doc.fontSize(17).font('Helvetica-Bold').fillColor('#ffffff')
      .text(companyName.toUpperCase(), nameX, 32, { width: 300, characterSpacing: 0.4, ellipsis: true, lineBreak: false });

    const contact = [agency.address, agency.phone, agency.email].filter(Boolean).join('  ·  ');
    if (contact) {
      doc.fillOpacity(0.8).fontSize(8).font('Helvetica').fillColor('#ffffff')
        .text(contact, nameX, 56, { width: 300, ellipsis: true, lineBreak: false });
      doc.fillOpacity(1);
    }

    // Document-type chip, right aligned on the band.
    const chipW = 168;
    doc.roundedRect(595 - M - chipW, 34, chipW, 30, 15).fill(shade(brand, 0.3));
    doc.fontSize(10.5).font('Helvetica-Bold').fillColor('#ffffff')
      .text(headline, 595 - M - chipW, 44, { width: chipW, align: 'center', characterSpacing: 1.1 });

    // ── Summary cards ─────────────────────────────────────────────────────────
    let y = BAND_H + 18;
    const cards = [
      meta.groupNumber && { label: 'GROUP NO.', value: meta.groupNumber, accent: true },
      { label: 'TRAVELLERS', value: String(rows.length), accent: true },
      meta.destination && { label: 'DESTINATION', value: meta.destination },
      meta.travelDate && { label: 'TRAVEL DATE', value: fmtDate(meta.travelDate) },
      { label: 'DATE OF PRINT', value: printedOn },
    ].filter(Boolean).slice(0, 4) as Array<{ label: string; value: string; accent?: boolean }>;

    const CARD_H = 44;
    const gap = 10;
    const cardW = (W - gap * (cards.length - 1)) / cards.length;
    cards.forEach((c, i) => {
      const x = M + i * (cardW + gap);
      doc.roundedRect(x, y, cardW, CARD_H, 6)
        .fillAndStroke(c.accent ? tint(brand, 0.9) : '#f8fafc', c.accent ? tint(brand, 0.7) : hairline);
      doc.fontSize(6.5).font('Helvetica-Bold').fillColor(muted)
        .text(c.label, x + 10, y + 9, { width: cardW - 16, characterSpacing: 0.8, lineBreak: false });
      doc.fontSize(11).font('Helvetica-Bold').fillColor(c.accent ? shade(brand, 0.15) : ink)
        .text(c.value, x + 10, y + 22, { width: cardW - 16, ellipsis: true, lineBreak: false });
    });
    y += CARD_H + 14;

    // ── Subject strip: what this list is, and who it was prepared for ─────────
    if (meta.groupName || meta.partnerCompany) {
      const STRIP_H = 32;
      doc.roundedRect(M, y, W, STRIP_H, 6).fill(tint(brand, 0.95));
      doc.rect(M, y + 6, 3, STRIP_H - 12).fill(brand);
      if (meta.groupName) {
        doc.fontSize(11).font('Helvetica-Bold').fillColor(shade(brand, 0.2))
          .text(meta.groupName, M + 14, y + 11, { width: W / 2, ellipsis: true, lineBreak: false });
      }
      if (meta.partnerCompany) {
        doc.fontSize(8).font('Helvetica').fillColor(muted)
          .text('Prepared for', M + W / 2, y + 7, { width: W / 2 - 14, align: 'right', lineBreak: false });
        doc.fontSize(9.5).font('Helvetica-Bold').fillColor(ink)
          .text(meta.partnerCompany, M + W / 2, y + 18, { width: W / 2 - 14, align: 'right', ellipsis: true, lineBreak: false });
      }
      y += STRIP_H + 14;
    }

    // ── Table ─────────────────────────────────────────────────────────────────
    const cols = [
      { label: '#', x: M, w: 26 },
      { label: 'PASSPORT NO.', x: M + 26, w: 86 },
      { label: 'TRAVELLER NAME', x: M + 112, w: 150 },
      { label: (meta.numberLabel || 'Visa Number').toUpperCase(), x: M + 262, w: 104 },
      { label: 'PURPOSE', x: M + 366, w: 86 },
      { label: 'ISSUED', x: M + 452, w: 63 },
    ];
    const ROW_H = 26;

    function drawTableHeader() {
      doc.rect(M, y, W, 24).fill(shade(brand, 0.12));
      doc.fontSize(7).font('Helvetica-Bold').fillColor('#ffffff');
      for (const c of cols) {
        doc.text(c.label, c.x + 7, y + 9, { width: c.w - 10, characterSpacing: 0.5, ellipsis: true, lineBreak: false });
      }
      y += 24;
    }

    /** Slim repeat band so a continued page still carries the agency's identity. */
    function startContinuationPage() {
      doc.addPage();
      doc.rect(0, 0, 595, 5).fill(brand);
      doc.fontSize(8).font('Helvetica-Bold').fillColor(muted)
        .text(`${companyName.toUpperCase()} — ${headline}`, M, 26, { width: W / 2, ellipsis: true, lineBreak: false });
      doc.font('Helvetica').fillColor(muted)
        .text(
          [meta.groupNumber, 'continued'].filter(Boolean).join(' · '),
          M + W / 2, 26, { width: W / 2, align: 'right', lineBreak: false }
        );
      y = 48;
      drawTableHeader();
    }

    drawTableHeader();

    rows.forEach((r, i) => {
      if (y + ROW_H > BOTTOM) startContinuationPage();

      if (i % 2 === 1) doc.rect(M, y, W, ROW_H).fill(zebra);

      doc.fontSize(8).font('Helvetica').fillColor('#94a3b8')
        .text(String(i + 1), cols[0].x + 7, y + 9, { width: cols[0].w - 10, lineBreak: false });

      doc.fontSize(9).font('Helvetica-Bold').fillColor(ink)
        .text(r.passportNumber || '—', cols[1].x + 7, y + 8.5, { width: cols[1].w - 10, ellipsis: true, lineBreak: false });

      doc.fontSize(9).font('Helvetica').fillColor('#334155')
        .text(r.name || '—', cols[2].x + 7, y + 8.5, { width: cols[2].w - 10, ellipsis: true, lineBreak: false });

      // The document number is the reason the list exists — give it a pill.
      if (r.documentNumber) {
        doc.fontSize(8.5).font('Helvetica-Bold');
        const textW = Math.min(doc.widthOfString(r.documentNumber), cols[3].w - 24);
        doc.roundedRect(cols[3].x + 5, y + 5.5, textW + 14, 15, 7.5).fill(tint(brand, 0.86));
        doc.fillColor(shade(brand, 0.2))
          .text(r.documentNumber, cols[3].x + 12, y + 9, { width: textW, ellipsis: true, lineBreak: false });
      } else {
        doc.fontSize(8.5).font('Helvetica').fillColor('#cbd5e1')
          .text('—', cols[3].x + 7, y + 9, { width: cols[3].w - 10, lineBreak: false });
      }

      doc.fontSize(8.5).font('Helvetica').fillColor('#475569')
        .text(r.purpose || '—', cols[4].x + 7, y + 9, { width: cols[4].w - 10, ellipsis: true, lineBreak: false });

      doc.fontSize(8.5).fillColor(muted)
        .text(fmtDate(r.issueDate), cols[5].x + 7, y + 9, { width: cols[5].w - 10, lineBreak: false });

      y += ROW_H;
      doc.moveTo(M, y).lineTo(M + W, y).strokeColor(hairline).lineWidth(0.5).stroke();
    });

    // ── Total ─────────────────────────────────────────────────────────────────
    if (y + 46 > BOTTOM) startContinuationPage();
    y += 12;
    doc.roundedRect(M, y, W, 34, 6).fill(tint(brand, 0.9));
    doc.fontSize(9).font('Helvetica-Bold').fillColor(shade(brand, 0.2))
      .text('TOTAL TRAVELLERS', M + 14, y + 12, { width: 200, characterSpacing: 0.6, lineBreak: false });
    doc.fontSize(13).font('Helvetica-Bold').fillColor(shade(brand, 0.1))
      .text(String(rows.length), M + W - 214, y + 10, { width: 200, align: 'right', lineBreak: false });
    y += 34;

    // ── Signature / stamp ─────────────────────────────────────────────────────
    if (y + 70 < BOTTOM) {
      y += 34;
      const sigW = 190;
      const slots: Array<[string, number]> = [
        ['Authorised Signature', M],
        ['Company Stamp', M + W - sigW],
      ];
      for (const [label, x] of slots) {
        doc.moveTo(x, y).lineTo(x + sigW, y)
          .strokeColor('#cbd5e1').lineWidth(0.7).dash(2, { space: 2 }).stroke().undash();
        doc.fontSize(8).font('Helvetica').fillColor(muted)
          .text(label, x, y + 6, { width: sigW, lineBreak: false });
      }
    }

    // ── Footer on every page ──────────────────────────────────────────────────
    const range = doc.bufferedPageRange();
    const footer = [companyName, agency.address, agency.phone, (agency as any).rcNumber && `RC: ${(agency as any).rcNumber}`]
      .filter(Boolean).join('  ·  ');
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      doc.page.margins.bottom = 0;
      doc.moveTo(M, 792).lineTo(M + W, 792).strokeColor(hairline).lineWidth(0.5).stroke();
      doc.fontSize(7).font('Helvetica').fillColor('#9ca3af')
        .text(footer, M, 800, { width: W - 70, ellipsis: true, lineBreak: false });
      doc.fontSize(7).font('Helvetica-Bold').fillColor(muted)
        .text(`Page ${i - range.start + 1} of ${range.count}`, M + W - 70, 800, { width: 70, align: 'right', lineBreak: false });
    }

    doc.end();
  });
}
