// backend/src/services/pdf/tickets.js
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';

const PAGE_W = 226;   // 80mm en puntos
const MARGIN = 10;
const COL    = PAGE_W - MARGIN * 2;   // 206pt area util

const SEP = '-'.repeat(32);           // ASCII puro — sin caracteres especiales

const PAYMENT_LABELS = {
  CASH:  'Efectivo',
  CARD:  'Tarjeta',
  MIXED: 'Mixto'
};

export async function buildSaleTicketPDF(res, { sale, store = {} }) {
  const qrBuffer = await QRCode.toBuffer(String(sale._id), { width: 70, margin: 1 });

  const doc = new PDFDocument({
    size:    [PAGE_W, 900],
    margins: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN },
    autoFirstPage: true
  });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="ticket-${sale._id}.pdf"`);
  doc.pipe(res);

  const storeName = store.name    || process.env.STORE_NAME    || 'Cafecito Feliz';
  const storeAddr = store.address || process.env.STORE_ADDRESS || 'Sucursal unica';
  const now       = new Date(sale.createdAt || Date.now())
                      .toLocaleString('es-MX', { hour12: true });

  // ── Header ──────────────────────────────────
  doc.fontSize(13).font('Helvetica-Bold')
     .text(storeName, MARGIN, MARGIN, { width: COL, align: 'center' });
  doc.moveDown(0.2);
  doc.fontSize(8).font('Helvetica')
     .text(storeAddr, MARGIN, doc.y, { width: COL, align: 'center' });
  doc.moveDown(0.1);
  doc.text(now, MARGIN, doc.y, { width: COL, align: 'center' });
  doc.moveDown(0.3);
  doc.text(SEP, MARGIN, doc.y, { width: COL, align: 'center' });
  doc.moveDown(0.2);
  doc.fontSize(10).font('Helvetica-Bold')
     .text(`Folio: ${String(sale._id).slice(-8).toUpperCase()}`,
           MARGIN, doc.y, { width: COL, align: 'center' });
  doc.moveDown(0.3);
  doc.fontSize(7).font('Helvetica')
     .text(SEP, MARGIN, doc.y, { width: COL, align: 'center' });

  // ── Columnas: nombre(108) cant(20) precio(34) total(38) + gaps = 206 ──
  const C_NAME  = MARGIN;       // 10
  const C_QTY   = MARGIN + 110; // 120
  const C_PRICE = MARGIN + 133; // 143
  const C_TOTAL = MARGIN + 168; // 178 → 178+38=216 <= 216 ✅

  // Encabezado tabla
  doc.moveDown(0.3);
  let y = doc.y;
  doc.fontSize(7).font('Helvetica-Bold');
  doc.text('Producto', C_NAME,  y, { width: 108, lineBreak: false });
  doc.text('Cant',     C_QTY,   y, { width: 20,  align: 'right', lineBreak: false });
  doc.text('P.Unit',   C_PRICE, y, { width: 33,  align: 'right', lineBreak: false });
  doc.text('Total',    C_TOTAL, y, { width: 38,  align: 'right' });
  doc.fontSize(7).font('Helvetica')
     .text(SEP, MARGIN, doc.y, { width: COL, align: 'center' });

  // Items
  for (const it of (sale.items || [])) {
    y = doc.y;
    const name  = String(it.name  || '---').substring(0, 19);
    const qty   = String(it.quantity || 0);
    const price = `$${Number(it.unitPrice || 0).toFixed(2)}`;
    const total = `$${Number(it.total     || 0).toFixed(2)}`;

    doc.fontSize(7).font('Helvetica');
    doc.text(name,  C_NAME,  y, { width: 108, lineBreak: false });
    doc.text(qty,   C_QTY,   y, { width: 20,  align: 'right', lineBreak: false });
    doc.text(price, C_PRICE, y, { width: 33,  align: 'right', lineBreak: false });
    doc.text(total, C_TOTAL, y, { width: 38,  align: 'right' });
    doc.moveDown(0.2);
  }

  // ── Totales ──────────────────────────────────
  doc.fontSize(7).font('Helvetica')
     .text(SEP, MARGIN, doc.y, { width: COL, align: 'center' });
  doc.moveDown(0.2);

  const totalRow = (label, value, bold = false) => {
    const font = bold ? 'Helvetica-Bold' : 'Helvetica';
    const size = bold ? 9 : 7;
    y = doc.y;
    doc.fontSize(size).font(font);
    doc.text(label, MARGIN,       y, { width: 120,        lineBreak: false });
    doc.text(value, MARGIN + 120, y, { width: COL - 120,  align: 'right' });
    doc.moveDown(bold ? 0.25 : 0.15);
  };

  totalRow('Subtotal',  `$${Number(sale.gross    || 0).toFixed(2)}`);
  totalRow('IVA',       `$${Number(sale.taxes    || 0).toFixed(2)}`);
  if (Number(sale.discount) > 0) {
    totalRow('Descuento', `-$${Number(sale.discount).toFixed(2)}`);
  }
  totalRow('TOTAL', `$${Number(sale.total || 0).toFixed(2)}`, true);

  // Forma de pago — texto plano, sin emojis
  doc.moveDown(0.2);
  const payLabel = PAYMENT_LABELS[sale.paidWith] || (sale.paidWith || 'N/A');
  doc.fontSize(7).font('Helvetica')
     .text(`Forma de pago: ${payLabel}`, MARGIN, doc.y, { width: COL, align: 'center' });

  // ── QR ───────────────────────────────────────
  doc.moveDown(0.4);
  doc.fontSize(7).font('Helvetica')
     .text(SEP, MARGIN, doc.y, { width: COL, align: 'center' });
  doc.moveDown(0.3);

  const qrSize = 68;
  const qrX    = MARGIN + Math.floor((COL - qrSize) / 2);
  const qrY    = doc.y;
  doc.image(qrBuffer, qrX, qrY, { width: qrSize, height: qrSize });
  // Avanzar manualmente: PDFKit no actualiza doc.y tras image()
  doc.y = qrY + qrSize + 8;

  // ── Footer ───────────────────────────────────
  doc.fontSize(7).font('Helvetica')
     .text(SEP, MARGIN, doc.y, { width: COL, align: 'center' });
  doc.moveDown(0.2);
  doc.fontSize(8).font('Helvetica-Bold')
     .text('Gracias por su compra!', MARGIN, doc.y, { width: COL, align: 'center' });
  doc.moveDown(0.15);
  doc.fontSize(6).font('Helvetica')
     .text('Revise su cambio antes de salir.',
           MARGIN, doc.y, { width: COL, align: 'center' });

  doc.end();
}