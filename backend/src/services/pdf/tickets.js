// backend/src/services/pdf/tickets.js
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';

const PAGE_W = 226;   // 80mm en puntos
const MARGIN = 12;
const COL    = PAGE_W - MARGIN * 2;

/**
 * Genera el PDF del ticket de venta y lo envía directamente al response HTTP.
 */
export async function buildSaleTicketPDF(res, { sale, store = {} }) {
  // Generar QR antes de abrir el stream
  const qrData   = String(sale._id);
  const qrBuffer = await QRCode.toBuffer(qrData, { width: 70, margin: 1 });

  const doc = new PDFDocument({
    size:    [PAGE_W, 800],
    margins: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN },
    autoFirstPage: true
  });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="ticket-${sale._id}.pdf"`);
  doc.pipe(res);

  const storeName = store.name    || process.env.STORE_NAME    || 'Cafecito Feliz';
  const storeAddr = store.address || process.env.STORE_ADDRESS || 'Sucursal única';
  const now       = new Date(sale.createdAt || Date.now())
                      .toLocaleString('es-MX', { hour12: true });

  // ── Header ─────────────────────────────────────
  doc.fontSize(13).font('Helvetica-Bold')
     .text(storeName, MARGIN, MARGIN, { width: COL, align: 'center' });

  doc.fontSize(8).font('Helvetica')
     .text(storeAddr, { width: COL, align: 'center' })
     .text(now,       { width: COL, align: 'center' });

  doc.moveDown(0.4);
  doc.fontSize(8).font('Helvetica')
     .text('─'.repeat(38), { width: COL, align: 'center' });

  // Folio
  doc.moveDown(0.3);
  doc.fontSize(9).font('Helvetica-Bold')
     .text(`Folio: ${String(sale._id).slice(-8).toUpperCase()}`,
           { width: COL, align: 'center' });

  // ── Items ───────────────────────────────────────
  doc.moveDown(0.4);
  doc.fontSize(8).font('Helvetica')
     .text('─'.repeat(38), { width: COL, align: 'center' });

  doc.moveDown(0.2);

  // Encabezado de tabla
  const colName  = MARGIN;
  const colQty   = MARGIN + 100;
  const colPrice = MARGIN + 125;
  const colTotal = MARGIN + 160;

  doc.fontSize(7).font('Helvetica-Bold');
  doc.text('Producto',   colName,  doc.y, { width: 98,  lineBreak: false });
  doc.text('Cant',       colQty,   doc.y, { width: 23,  lineBreak: false, align: 'right' });
  doc.text('P.Unit',     colPrice, doc.y, { width: 33,  lineBreak: false, align: 'right' });
  doc.text('Total',      colTotal, doc.y, { width: 38,  align: 'right' });

  doc.moveDown(0.2);
  doc.fontSize(7).font('Helvetica')
     .text('─'.repeat(38), { width: COL, align: 'center' });
  doc.moveDown(0.1);

  const items = sale.items || [];
  for (const it of items) {
    const y = doc.y;
    doc.fontSize(7).font('Helvetica');
    doc.text(it.name || '—',              colName,  y, { width: 98,  lineBreak: false });
    doc.text(String(it.quantity),         colQty,   y, { width: 23,  lineBreak: false, align: 'right' });
    doc.text(`$${Number(it.unitPrice || 0).toFixed(2)}`, colPrice, y, { width: 33, lineBreak: false, align: 'right' });
    doc.text(`$${Number(it.total     || 0).toFixed(2)}`, colTotal, y, { width: 38, align: 'right' });
    doc.moveDown(0.15);
  }

  // ── Totales ─────────────────────────────────────
  doc.moveDown(0.2);
  doc.fontSize(7).font('Helvetica')
     .text('─'.repeat(38), { width: COL, align: 'center' });
  doc.moveDown(0.2);

  const printRow = (label, value, bold = false) => {
    const font = bold ? 'Helvetica-Bold' : 'Helvetica';
    const size = bold ? 9 : 7;
    const y    = doc.y;
    doc.fontSize(size).font(font);
    doc.text(label,  MARGIN,         y, { width: 110, lineBreak: false });
    doc.text(value,  MARGIN + 110,   y, { width: COL - 110, align: 'right' });
    doc.moveDown(bold ? 0.3 : 0.15);
  };

  printRow('Subtotal',  `$${Number(sale.gross    || 0).toFixed(2)}`);
  printRow('IVA',       `$${Number(sale.taxes    || 0).toFixed(2)}`);
  if (Number(sale.discount) > 0) {
    printRow('Descuento', `-$${Number(sale.discount).toFixed(2)}`);
  }
  printRow('TOTAL',     `$${Number(sale.total    || 0).toFixed(2)}`, true);

  // Forma de pago
  doc.moveDown(0.2);
  const methodLabel = { CASH: '💵 Efectivo', CARD: '💳 Tarjeta', MIXED: '🔀 Mixto' };
  doc.fontSize(7).font('Helvetica')
     .text(`Pago: ${methodLabel[sale.paidWith] || sale.paidWith || '—'}`,
           { width: COL, align: 'center' });

  // ── QR ──────────────────────────────────────────
  doc.moveDown(0.4);
  doc.fontSize(7).font('Helvetica')
     .text('─'.repeat(38), { width: COL, align: 'center' });

  doc.moveDown(0.3);
  const qrX = MARGIN + (COL - 70) / 2;
  doc.image(qrBuffer, qrX, doc.y, { width: 70, height: 70 });
  doc.moveDown(4.2);

  // ── Footer ───────────────────────────────────────
  doc.fontSize(7).font('Helvetica')
     .text('─'.repeat(38), { width: COL, align: 'center' });
  doc.moveDown(0.2);
  doc.fontSize(8).font('Helvetica-Bold')
     .text('¡Gracias por su compra!', { width: COL, align: 'center' });
  doc.fontSize(6).font('Helvetica')
     .text('Cambios y devoluciones en 7 días con ticket.',
           { width: COL, align: 'center' });

  doc.end();
}