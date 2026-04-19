import PDFDocument from 'pdfkit';
import https from 'https';
import { IBill } from '../models/Bill';

const LOGO_URL = 'https://res.cloudinary.com/dvwey9irk/image/upload/v1776608648/royal-suites/logo.jpg';

function fetchImageBuffer(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

export async function generateReceiptPDF(bill: IBill & { guest?: any; reservation?: any }): Promise<Buffer> {
  const logoBuffer = await fetchImageBuffer(LOGO_URL).catch(() => null);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Header — logo + name
    if (logoBuffer) {
      doc.image(logoBuffer, doc.page.width / 2 - 30, doc.y, { width: 60, height: 60, align: 'center' });
      doc.moveDown(4);
    }
    doc
      .fillColor('#0D1B3E')
      .fontSize(24)
      .font('Helvetica-Bold')
      .text('ROYAL SUITES', { align: 'center' });

    doc.fontSize(10).fillColor('#C9A84C').text('Boutique Hotel & Spa', { align: 'center' });
    doc.moveDown();

    doc.strokeColor('#C9A84C').lineWidth(1).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.5);

    doc.fillColor('#0D1B3E').fontSize(18).font('Helvetica-Bold').text('RECEIPT', { align: 'center' });
    doc.moveDown();

    // Guest info
    const guestName = bill.guest?.name || 'Guest';
    const guestEmail = bill.guest?.email || '';
    doc.fontSize(11).font('Helvetica').fillColor('#333');
    doc.text(`Guest: ${guestName}`);
    doc.text(`Email: ${guestEmail}`);
    doc.text(`Bill ID: ${bill._id}`);
    doc.text(`Date: ${new Date().toLocaleDateString()}`);
    doc.moveDown();

    // Line items
    doc.strokeColor('#C9A84C').lineWidth(0.5).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.5);

    doc.font('Helvetica-Bold').fontSize(11).fillColor('#0D1B3E');
    doc.text('Description', 50, doc.y, { width: 300 });
    doc.text('Amount', 400, doc.y - doc.currentLineHeight(), { width: 150, align: 'right' });
    doc.moveDown(0.5);

    doc.font('Helvetica').fontSize(10).fillColor('#333');
    for (const item of bill.lineItems) {
      const y = doc.y;
      doc.text(item.description, 50, y, { width: 300 });
      doc.text(`$${item.amount.toFixed(2)}`, 400, y, { width: 150, align: 'right' });
      doc.moveDown(0.3);
    }

    doc.moveDown(0.5);
    doc.strokeColor('#C9A84C').lineWidth(0.5).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.5);

    // Totals
    const totals = [
      ['Room Charges', bill.roomCharges],
      ['Food & Beverages', bill.foodCharges],
      ['Spa Services', bill.spaCharges],
      ['Other', bill.otherCharges],
      ['Subtotal', bill.totalAmount],
      ['Tax (13% VAT)', bill.taxAmount],
    ];

    doc.font('Helvetica').fontSize(11);
    for (const [label, amount] of totals) {
      const y = doc.y;
      doc.fillColor('#333').text(String(label), 50, y, { width: 300 });
      doc.text(`$${Number(amount).toFixed(2)}`, 400, y, { width: 150, align: 'right' });
      doc.moveDown(0.3);
    }

    doc.moveDown(0.5);
    doc.strokeColor('#C9A84C').lineWidth(1).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.5);

    const grandY = doc.y;
    doc.font('Helvetica-Bold').fontSize(14).fillColor('#0D1B3E').text('TOTAL', 50, grandY, { width: 300 });
    doc.text(`$${bill.grandTotal.toFixed(2)}`, 400, grandY, { width: 150, align: 'right' });

    doc.moveDown(2);
    doc.font('Helvetica').fontSize(10).fillColor('#C9A84C').text(
      'Thank you for staying at Royal Suites. May your journey be blessed like the pharaohs of old.',
      { align: 'center' }
    );

    doc.end();
  });
}

