// backend/src/services/pdf/kitchenTicket.js
import PDFDocument from 'pdfkit';

/**
 * Genera un ticket de cocina en formato 80mm (226pt)
 * y lo envía como respuesta HTTP o devuelve un Buffer.
 */
export async function buildKitchenTicketPDF(order, { store = {} } = {}) {
  return new Promise((resolve, reject) => {
    const PAGE_W = 226;
    const MARGIN = 12;
    const COL    = PAGE_W - MARGIN * 2;

    const doc = new PDFDocument({
      size:    [PAGE_W, 600],
      margins: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN },
      autoFirstPage: true
    });

    const chunks = [];
    doc.on('data', c => chunks.push(c));
    doc.on('end',  () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const storeName = store.name || 'Cafecito Feliz';
    const now       = new Date().toLocaleString('es-MX', { hour12: true });

    // ── Header ──────────────────────────────────
    doc.fontSize(13).font('Helvetica-Bold')
       .text('ORDEN DE COCINA', MARGIN, MARGIN, { width: COL, align: 'center' });

    doc.moveDown(0.3);
    doc.fontSize(9).font('Helvetica')
       .text(storeName, { width: COL, align: 'center' })
       .text(now,       { width: COL, align: 'center' });

    if (order.cashier) {
      doc.text(`Cajero: ${order.cashier}`, { width: COL, align: 'center' });
    }

    // Folio
    doc.moveDown(0.3);
    doc.fontSize(10).font('Helvetica-Bold')
       .text(`Folio: ${String(order._id).slice(-6).toUpperCase()}`,
             { width: COL, align: 'center' });

    // Separador
    doc.moveDown(0.3);
    doc.fontSize(8).font('Helvetica')
       .text('─'.repeat(38), { width: COL, align: 'center' });

    // ── Items ────────────────────────────────────
    doc.moveDown(0.3);
    for (const item of order.items) {
      doc.fontSize(12).font('Helvetica-Bold')
         .text(`${item.quantity}x  ${item.name}`, MARGIN, doc.y, { width: COL });

      if (item.note) {
        doc.fontSize(9).font('Helvetica-Oblique')
           .text(`    ⚠ ${item.note}`, MARGIN, doc.y, { width: COL });
      }

      doc.moveDown(0.25);
    }

    // ── Notas generales ──────────────────────────
    if (order.notes) {
      doc.moveDown(0.3);
      doc.fontSize(8).font('Helvetica')
         .text('─'.repeat(38), { width: COL, align: 'center' });
      doc.fontSize(9).font('Helvetica-Oblique')
         .text(`Nota: ${order.notes}`, MARGIN, doc.y, { width: COL });
    }

    // ── Footer ───────────────────────────────────
    doc.moveDown(0.5);
    doc.fontSize(8).font('Helvetica')
       .text('─'.repeat(38), { width: COL, align: 'center' });
    doc.fontSize(8).font('Helvetica')
       .text('Preparar con prioridad', { width: COL, align: 'center' });

    doc.end();
  });
}