import PDFDocument from 'pdfkit';
import { IInvoice } from '../models/Invoice';
import { IReceipt } from '../models/Receipt';
import { IAgency } from '../models/Agency';
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
  const primaryColor = (agency as any).branding?.primaryColor || '#1a56db';
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

    const primaryColor = (agency as any).branding?.primaryColor || '#1a56db';
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
      sent: '#2563eb', draft: '#6b7280', cancelled: '#9ca3af',
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
export async function generateReceiptPDF(invoice: IInvoice, agency: IAgency, paymentIndex?: number): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks: Buffer[] = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const primaryColor = (agency as any).branding?.primaryColor || '#1a56db';
    const companyName = (agency as any).branding?.companyName || agency.name;
    const customer = (invoice as any).customerId as any;
    const customerName = customer?.fullName || (customer ? `${customer.firstName} ${customer.lastName}` : 'Customer');

    // Determine which payment(s) to show
    const payments = paymentIndex !== undefined
      ? [invoice.payments[paymentIndex]].filter(Boolean)
      : invoice.payments;

    const receiptNumber = `RCP-${invoice.invoiceNumber}-${paymentIndex !== undefined ? String(paymentIndex + 1).padStart(2, '0') : 'ALL'}`;
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

    const primaryColor = (agency as any).branding?.primaryColor || '#1a56db';
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
