// backend/src/services/pdf/tickets.js
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';

function money(n) {
  return `$${(Number(n) || 0).toFixed(2)}`;
}

/**
 * Genera y hace stream del PDF de ticket de venta a la respuesta HTTP.
 * @param {import('express').Response} res
 * @param {{ sale: object, store?: { name: string, address: string } }} options
 */
export async function buildSaleTicketPDF(res, {
  sale,
  store = { name: 'Cafecito Feliz', address: 'Sucursal única' }
}) {
  // Generar QR antes de iniciar el stream del PDF
  const qrDataURL = await QRCode.toDataURL(`sale:${sale._id}`);
  const qrBuffer = Buffer.from(qrDataURL.split(',')[1], 'base64');

  const doc = new PDFDocument({
    size: [226, 700],   // 80mm de ancho en puntos ≈ 226pt; alto flexible
    margin: 10,
    autoFirstPage: true,
    bufferPages: false
  });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename=ticket_${sale._id}.pdf`);
  doc.pipe(res);

  const PAGE_W = 226;
  const COL_L = 10;
  const COL_R = PAGE_W - 10;
  const LINE_W = PAGE_W - 20;

  // ─────────────────────────────────────────
  // CABECERA
  // ─────────────────────────────────────────
  doc.fontSize(11).font('Helvetica-Bold')
    .text(store.name, COL_L, 12, { width: LINE_W, align: 'center' });
  doc.fontSize(8).font('Helvetica')
    .text(store.address, COL_L, doc.y, { width: LINE_W, align: 'center' });

  doc.moveDown(0.3);
  doc.fontSize(7)
    .text(`Fecha: ${new Date(sale.createdAt).toLocaleString('es-MX')}`, { width: LINE_W, align: 'center' })
    .text(`Cajero: ${sale.userId || '—'}`, { width: LINE_W, align: 'center' })
    .text(`Folio: ${sale._id}`, { width: LINE_W, align: 'center' });

  doc.moveDown(0.4);
  doc.moveTo(COL_L, doc.y).lineTo(COL_R, doc.y).lineWidth(0.5).stroke();
  doc.moveDown(0.3);

  // ─────────────────────────────────────────
  // DETALLE DE ÍTEMS
  // ─────────────────────────────────────────
  doc.fontSize(8).font('Helvetica-Bold')
    .text('Artículo', COL_L, doc.y, { width: 100 })
    .text('Cant', COL_L + 100, doc.y - doc.currentLineHeight(), { width: 30, align: 'right' })
    .text('Total', COL_L + 130, doc.y - doc.currentLineHeight(), { width: LINE_W - 130, align: 'right' });
  doc.font('Helvetica');
  doc.moveDown(0.2);
  doc.moveTo(COL_L, doc.y).lineTo(COL_R, doc.y).lineWidth(0.3).stroke();
  doc.moveDown(0.2);

  for (const it of (sale.items || [])) {
    const lineY = doc.y;
    doc.fontSize(8)
      .text(it.name || '—', COL_L, lineY, { width: 98 });
    doc.text(`x${it.quantity}`, COL_L + 100, lineY, { width: 28, align: 'right' });
    doc.text(money(it.total), COL_L + 130, lineY, { width: LINE_W - 130, align: 'right' });
    doc.moveDown(0.15);

    // Precio unitario en gris (línea extra)
    doc.fontSize(6.5).fillColor('#555')
      .text(`  P.U.: ${money(it.unitPrice)}  Sub: ${money(it.subtotal)}  IVA: ${money(it.tax)}`,
        COL_L, doc.y, { width: LINE_W });
    doc.fillColor('#000').moveDown(0.3);
  }

  // ─────────────────────────────────────────
  // TOTALES
  // ─────────────────────────────────────────
  doc.moveDown(0.2);
  doc.moveTo(COL_L, doc.y).lineTo(COL_R, doc.y).lineWidth(0.5).stroke();
  doc.moveDown(0.3);

  const rows = [
    ['Subtotal', money(sale.gross)],
    ['IVA', money(sale.taxes)],
  ];
  if (Number(sale.discount) > 0) rows.push(['Descuento', `-${money(sale.discount)}`]);

  for (const [label, val] of rows) {
    const ty = doc.y;
    doc.fontSize(8).text(label, COL_L, ty, { width: 100 });
    doc.text(val, COL_L + 100, ty, { width: LINE_W - 100, align: 'right' });
    doc.moveDown(0.25);
  }

  doc.moveDown(0.1);
  doc.moveTo(COL_L, doc.y).lineTo(COL_R, doc.y).lineWidth(0.5).stroke();
  doc.moveDown(0.3);

  const totalY = doc.y;
  doc.fontSize(11).font('Helvetica-Bold')
    .text('TOTAL', COL_L, totalY, { width: 100 });
  doc.text(money(sale.total), COL_L + 100, totalY, { width: LINE_W - 100, align: 'right' });
  doc.font('Helvetica').moveDown(0.4);

  // Forma de pago
  doc.fontSize(8).text(`Forma de pago: ${sale.paidWith}`, { width: LINE_W, align: 'center' });

  if (sale.notes && String(sale.notes).trim()) {
    doc.moveDown(0.3);
    doc.fontSize(7).text(`Nota: ${String(sale.notes).trim()}`, { width: LINE_W });
  }

  // ─────────────────────────────────────────
  // QR CODE
  // ─────────────────────────────────────────
  doc.moveDown(0.6);
  doc.moveTo(COL_L, doc.y).lineTo(COL_R, doc.y).lineWidth(0.3).stroke();
  doc.moveDown(0.4);

  const qrSize = 70;
  const qrX = (PAGE_W - qrSize) / 2;
  doc.image(qrBuffer, qrX, doc.y, { width: qrSize, height: qrSize });
  doc.moveDown(5);

  // ─────────────────────────────────────────
  // PIE
  // ─────────────────────────────────────────
  doc.fontSize(7)
    .text('¡Gracias por su compra!', { width: LINE_W, align: 'center' })
    .text('Devoluciones con ticket en 7 días.', { width: LINE_W, align: 'center' });

  doc.end();
}