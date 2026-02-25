// backend/src/services/pdf/kitchenTicket.js
import PDFDocument from 'pdfkit';

const PAGE_W = 226;
const MARGIN = 12;
const COL    = PAGE_W - MARGIN * 2;   // 202pt

const SEP = '-'.repeat(30);           // ASCII puro — sin caracteres especiales

export async function buildKitchenTicketPDF(order, { store = {} } = {}) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size:    [PAGE_W, 600],
      margins: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN },
      autoFirstPage: true
    });

    const chunks = [];
    doc.on('data',  c => chunks.push(c));
    doc.on('end',   () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const storeName = store.name || process.env.STORE_NAME || 'Cafecito Feliz';
    const now       = new Date().toLocaleString('es-MX', { hour12: true });

    // ── Header ──────────────────────────────────
    doc.fontSize(13).font('Helvetica-Bold')
       .text('*** ORDEN DE COCINA ***', MARGIN, MARGIN, { width: COL, align: 'center' });

    doc.moveDown(0.3);
    doc.fontSize(9).font('Helvetica')
       .text(storeName, MARGIN, doc.y, { width: COL, align: 'center' });
    doc.moveDown(0.1);
    doc.text(now, MARGIN, doc.y, { width: COL, align: 'center' });

    if (order.cashier) {
      doc.moveDown(0.1);
      doc.text(`Cajero: ${order.cashier}`, MARGIN, doc.y, { width: COL, align: 'center' });
    }

    // Folio
    doc.moveDown(0.3);
    doc.fontSize(10).font('Helvetica-Bold')
       .text(`Folio: ${String(order._id).slice(-6).toUpperCase()}`,
             MARGIN, doc.y, { width: COL, align: 'center' });

    // Separador
    doc.moveDown(0.3);
    doc.fontSize(8).font('Helvetica')
       .text(SEP, MARGIN, doc.y, { width: COL, align: 'center' });

    // ── Items ────────────────────────────────────
    doc.moveDown(0.3);
    for (const item of (order.items || [])) {
      doc.fontSize(12).font('Helvetica-Bold')
         .text(`${item.quantity}x  ${item.name}`, MARGIN, doc.y, { width: COL });

      if (item.note) {
        doc.fontSize(9).font('Helvetica-Oblique')
           .text(`  Nota: ${item.note}`, MARGIN, doc.y, { width: COL });
      }
      doc.moveDown(0.25);
    }

    // ── Notas generales ──────────────────────────
    if (order.notes) {
      doc.moveDown(0.2);
      doc.fontSize(8).font('Helvetica')
         .text(SEP, MARGIN, doc.y, { width: COL, align: 'center' });
      doc.moveDown(0.1);
      doc.fontSize(9).font('Helvetica-Oblique')
         .text(`Nota general: ${order.notes}`, MARGIN, doc.y, { width: COL });
    }

    // ── Footer ───────────────────────────────────
    doc.moveDown(0.5);
    doc.fontSize(8).font('Helvetica')
       .text(SEP, MARGIN, doc.y, { width: COL, align: 'center' });
    doc.moveDown(0.2);
    doc.fontSize(8).font('Helvetica')
       .text('Preparar con prioridad', MARGIN, doc.y, { width: COL, align: 'center' });

    doc.end();
  });
}