import PDFDocument from 'pdfkit';
import getStream from 'get-stream';

export async function buildSessionPdf(session) {
  const doc = new PDFDocument({ margin: 40 });
  const stream = doc; // pdfkit es readable stream

  // Encabezado
  doc.fontSize(18).text('Reporte de Cierre de Caja', { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(10).text(`Folio: ${session._id}`);
  doc.text(`Apertura: ${fmtDate(session.openedAt)}`);
  if (session.closedAt) doc.text(`Cierre: ${fmtDate(session.closedAt)}`);
  doc.moveDown(0.5);
  doc.text(`Inicial: $${money(session.initialCash)}   Contado: $${money(session.countedCash || 0)}`);
  doc.text(`Esperado: $${money(session.expectedCash || 0)}   Diferencia: $${money(session.difference || 0)}`);
  doc.moveDown(1);

  // Totales
  doc.fontSize(12).text('Totales de ventas', { underline: true });
  doc.moveDown(0.3);
  doc.fontSize(10);
  const t = session.totals || {};
  doc.text(`Subtotal: $${money(t.gross || 0)}`);
  doc.text(`IVA: $${money(t.taxes || 0)}`);
  doc.text(`Descuento: $${money(t.discount || 0)}`);
  doc.text(`Total: $${money(t.total || 0)}`);
  doc.moveDown(1);

  // Formas de pago
  doc.fontSize(12).text('Formas de pago', { underline: true });
  doc.moveDown(0.3);
  (session.payments || []).forEach(p => {
    doc.fontSize(10).text(`${p.method}: $${money(p.total)} (${p.count} ventas)`);
  });
  doc.moveDown(1);

  // Movimientos manuales
  if (session.movements?.length) {
    doc.fontSize(12).text('Movimientos de caja', { underline: true });
    doc.moveDown(0.3);
    session.movements.forEach(m => {
      doc.fontSize(10).text(`${fmtDate(m.createdAt)} — ${m.type} — $${money(m.amount)} — ${m.reason || ''}`);
    });
    doc.moveDown(1);
  }

  // Notas
  if (session.notes) {
    doc.fontSize(12).text('Notas', { underline: true });
    doc.moveDown(0.3);
    doc.fontSize(10).text(session.notes);
  }

  doc.end();
  const buffer = await getStream.buffer(stream);
  return buffer;
}

function money(n) { return Number(n ?? 0).toFixed(2); }
function fmtDate(d) { return d ? new Date(d).toLocaleString() : '-'; }