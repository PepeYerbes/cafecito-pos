import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';

function money(n) { return `$${(Number(n) || 0).toFixed(2)}`; }

export async function buildSaleTicketPDF(res, { sale, store = { name: 'Mi Cafetería', address: 'Sucursal Centro' } }) {
  const doc = new PDFDocument({ size: 'A7', margin: 10 });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename=ticket_${sale._id}.pdf`);
  doc.pipe(res);

  // Encabezado
  doc.fontSize(10).text(store.name, { align: 'center' }).moveDown(0.1);
  doc.fontSize(8).text(store.address, { align: 'center' }).moveDown(0.2);
  doc.text(`Fecha: ${new Date(sale.createdAt).toLocaleString()}`, { align: 'center' });
  doc.text(`Cajero: ${sale.userId}`, { align: 'center' });
  doc.text(`Venta: ${sale._id}`, { align: 'center' });
  doc.moveDown(0.5);
  doc.moveTo(10, doc.y).lineTo(270, doc.y).stroke();

  // Detalle de items
  doc.moveDown(0.3);
  sale.items.forEach(it => {
    doc.fontSize(8).text(`${it.name} x${it.quantity}`);
    doc.text(` P.U.: ${money(it.unitPrice)}  Subt: ${money(it.subtotal)}`);
    doc.text(` IVA: ${money(it.tax)}  Total: ${money(it.total)}`);
    doc.moveDown(0.2);
  });

  doc.moveTo(10, doc.y).lineTo(270, doc.y).stroke().moveDown(0.3);

  // Totales (precio A: sin IVA)
  const gross = Number(sale.gross || 0);
  const taxes = Number(sale.taxes || 0);
  const discount = Number(sale.discount || 0);
  const totalBeforeDiscount = gross + taxes;
  const total = Number(sale.total || Math.max(0, totalBeforeDiscount - discount));

  doc.fontSize(9).text(`Subtotal: ${money(gross)}`);
  doc.text(`IVA: ${money(taxes)}`);
  if (discount > 0) doc.text(`Descuento: -${money(discount)}`);
  doc.fontSize(10).text(`TOTAL: ${money(total)}`, { align: 'right' });
  doc.moveDown(0.3);
  doc.fontSize(8).text(`Pago: ${sale.paidWith}`, { align: 'right' });

  // Notas (si hay)
  if (sale.notes && String(sale.notes).trim().length > 0) {
    doc.moveDown(0.3);
    doc.fontSize(8).text(`Notas: ${String(sale.notes).trim()}`);
  }

  // QR con el ID de la venta
  doc.moveDown(0.4);
  const qrDataURL = await QRCode.toDataURL(`sale:${sale._id}`);
  const b64 = qrDataURL.split(',')[1];
  const buf = Buffer.from(b64, 'base64');
  doc.image(buf, { fit: [80, 80], align: 'center' });

  doc.moveDown(0.2);
  doc.fontSize(8).text('Gracias por su compra', { align: 'center' });
  doc.text('Devoluciones con tickets en 7 días', { align: 'center' });

  doc.end();
}