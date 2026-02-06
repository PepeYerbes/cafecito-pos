// backend/src/services/pdf/sessionReport.js
import PDFDocument from 'pdfkit';
import getStream from 'get-stream';
import fs from 'fs';

const COLORS = {
  inkBlack: '#04151F',
  darkSlateGrey: '#183A37',
  wheat: '#EFD6AC',
  burntOrange: '#C44900',
  midnightViolet: '#432534'
};

function money(n) {
  return (Number(n ?? 0)).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
}
function fmtDate(d) {
  return d ? new Date(d).toLocaleString('es-MX', { hour12: false }) : '-';
}

/**
 * Opciones:
 * {
 *   company: { name, address? },
 *   branch?: { name },
 *   printedBy?: string,
 *   logoPath?: string     // default: backend/public/assets/logo.png
 * }
 */
export async function buildSessionPdf(session, options = {}) {
  const {
    company = { name: 'Cafecito Feliz', address: 'Sucursal única' },
    branch = { name: session.branchName || 'Sucursal única' },
    printedBy = 'Sistema',
    logoPath = 'public/assets/logo.png'
  } = options;

  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 56, bottom: 48, left: 40, right: 40 },
    info: {
      Title: `Cierre ${session._id}`,
      Author: company.name,
      Subject: 'Reporte de Cierre de Caja',
    }
  });

  // ===== Header & Footer =====
  const header = () => {
    const y = 24;
    if (logoPath && fs.existsSync(logoPath)) {
      try { doc.image(logoPath, 40, y - 6, { height: 28 }); } catch {}
    }
    doc.fillColor(COLORS.midnightViolet).fontSize(12).text(company.name, 90, y, { continued: true });
    doc.fillColor(COLORS.inkBlack).fontSize(10).text(' — Reporte de Cierre');

    doc.fontSize(8).fillColor('#6b7280').text(`Folio: ${session._id}`);
    doc.text(`Sucursal: ${branch.name}  |  Turno: ${session.shiftName || '-'}`);
  };

  const footer = () => {
    const y = doc.page.height - 32;
    doc.fontSize(8).fillColor('#6b7280');
    doc.text(`Generado: ${fmtDate(new Date())}`, 40, y, { width: 250, align: 'left' });
    doc.text(`Página ${doc.page.number}`, doc.page.width - 140, y, { width: 100, align: 'right' });
  };

  doc.on('pageAdded', () => { header(); footer(); });
  header(); footer();

  // ===== Encabezado principal =====
  doc.moveDown(2);
  doc.fontSize(18).fillColor(COLORS.midnightViolet).text('Cierre de Caja', { align: 'left' });
  doc.moveDown(0.5);
  doc.fontSize(10).fillColor(COLORS.inkBlack)
    .text(`Apertura: ${fmtDate(session.openedAt)}   Cierre: ${fmtDate(session.closedAt)}`);
  doc.text(`Cajero: ${session.userId || '—'}     Impreso por: ${printedBy}`);

  // Barra de acento
  doc.moveDown(0.6);
  doc.save().rect(40, doc.y, doc.page.width - 80, 3).fill(COLORS.burntOrange).restore();
  doc.moveDown(1);

  // ===== KPIs =====
  const diff = Number(session.difference || 0);
  const kpi = [
    { label: 'Inicial', value: money(session.initialCash) },
    { label: 'Contado', value: money(session.countedCash) },
    { label: 'Esperado', value: money(session.expectedCash) },
    { label: 'Diferencia', value: money(diff), color: (diff === 0 ? '#059669' : '#b91c1c') },
    { label: 'Ventas NETO', value: money(session?.totals?.total || 0) },
  ];
  drawKpis(doc, kpi);

  // ===== Totales de ventas =====
  sectionTitle(doc, 'Totales de ventas');
  tableKeyValue(doc, [
    ['Subtotal (sin IVA)', money(session?.totals?.gross || 0)],
    ['IVA',                 money(session?.totals?.taxes || 0)],
    ['Descuento',           money(session?.totals?.discount || 0)],
    ['Total Neto',          money(session?.totals?.total || 0)],
  ]);

  // ===== Desglose por método de pago =====
  sectionTitle(doc, 'Desglose por método de pago');
  const payments = (session.payments || []).map(p => ([
    p.method, String(p.count || 0), money(p.total || 0)
  ]));
  drawTable(doc, {
    headers: ['Método', 'Transacciones', 'Monto'],
    rows: payments.length ? payments : [['—', '0', money(0)]],
  });

  // ===== Movimientos manuales =====
  if (session.movements?.length) {
    sectionTitle(doc, 'Movimientos de caja');
    drawTable(doc, {
      headers: ['Fecha', 'Tipo', 'Monto', 'Motivo'],
      rows: session.movements.map(m => [
        fmtDate(m.createdAt),
        (m.type === 'IN' || m.type === 'INGRESO') ? 'INGRESO' : 'EGRESO',
        money(m.amount),
        String(m.reason || '')
      ])
    });
  }

  // ===== Notas =====
  if (session.notes && String(session.notes).trim().length > 0) {
    sectionTitle(doc, 'Notas');
    doc.fontSize(10).fillColor(COLORS.inkBlack).text(String(session.notes).trim(), { align: 'left' });
    doc.moveDown(0.5);
  }

  // ===== Firmas =====
  doc.moveDown(1.2);
  const baseY = doc.y + 20;
  const colW = (doc.page.width - 80) / 2;
  doc.moveTo(40, baseY).lineTo(40 + colW - 20, baseY).strokeColor(COLORS.wheat).stroke();
  doc.moveTo(40 + colW + 20, baseY).lineTo(doc.page.width - 40, baseY).stroke();
  doc.fontSize(9).fillColor(COLORS.darkSlateGrey)
    .text('Cajero', 40, baseY + 4, { width: colW - 20, align: 'left' })
    .text('Supervisor', 40 + colW + 20, baseY + 4, { width: colW - 20, align: 'left' });

  doc.end();
  return await getStream.buffer(doc);
}

/* ---------- Helpers de dibujo con branding ---------- */

function sectionTitle(doc, title) {
  doc.moveDown(0.8);
  doc.fontSize(12).fillColor(COLORS.midnightViolet).text(title);
  doc.moveDown(0.15);
  doc.save().rect(40, doc.y, 40, 2).fill(COLORS.burntOrange).restore();
  doc.moveDown(0.4);
}

function drawKpis(doc, items) {
  const startX = 40;
  const gap = 12;
  const cardW = ((doc.page.width - 80) - (gap * 4)) / 5; // 5 columnas
  const y = doc.y;

  items.forEach((k, idx) => {
    const x = startX + idx * (cardW + gap);
    doc.save()
      .roundedRect(x, y, cardW, 56, 6)
      .lineWidth(1)
      .strokeColor(COLORS.wheat)
      .stroke();
    doc.fontSize(9).fillColor(COLORS.darkSlateGrey).text(k.label, x + 8, y + 8);
    doc.fontSize(12).fillColor(k.color || COLORS.inkBlack).text(k.value, x + 8, y + 24);
    doc.restore();
  });

  doc.moveDown(4);
}

function tableKeyValue(doc, pairs) {
  const labelW = 220;
  pairs.forEach(([k, v]) => {
    doc.fontSize(10).fillColor(COLORS.darkSlateGrey).text(k, { continued: true, width: labelW });
    doc.fontSize(10).fillColor(COLORS.inkBlack).text(`  ${v}`);
  });
  doc.moveDown(0.6);
}

function drawTable(doc, { headers = [], rows = [] }) {
  const x = 40;
  const yStart = doc.y;
  const widths = calcWidths(doc.page.width - 80, headers.length);

  // Head
  doc.save().fontSize(9).fillColor(COLORS.inkBlack);
  headers.forEach((h, i) => {
    doc.rect(x + widths.slice(0, i).reduce((a, b) => a + b, 0), yStart, widths[i], 18).fill(COLORS.darkSlateGrey);
    doc.fillColor('#fff').text(h, x + widths.slice(0, i).reduce((a, b) => a + b, 0) + 6, yStart + 5, { width: widths[i] - 12 });
  });
  doc.restore();
  let y = yStart + 18;

  // Rows
  rows.forEach((r) => {
    const rowH = 20;

    // Salto de página si es necesario
    if (y + rowH > doc.page.height - 64) {
      doc.addPage();
      y = 80;
      // dibujar header de tabla en nueva página
      doc.save().fontSize(9);
      headers.forEach((h, i) => {
        doc.rect(x + widths.slice(0, i).reduce((a, b) => a + b, 0), y, widths[i], 18).fill(COLORS.darkSlateGrey);
        doc.fillColor('#fff').text(h, x + widths.slice(0, i).reduce((a, b) => a + b, 0) + 6, y + 5, { width: widths[i] - 12 });
      });
      doc.restore();
      y += 18;
    }

    r.forEach((cell, i) => {
      const cx = x + widths.slice(0, i).reduce((a, b) => a + b, 0);
      doc.rect(cx, y, widths[i], rowH).strokeColor(COLORS.wheat).lineWidth(0.6).stroke();
      doc.fontSize(9).fillColor(COLORS.inkBlack)
        .text(String(cell ?? ''), cx + 6, y + 6, { width: widths[i] - 12 });
    });
    y += rowH;
  });

  doc.moveDown(0.8);
}

function calcWidths(total, columns) {
  if (columns <= 0) return [];
  const w = Math.floor(total / columns);
  const arr = Array(columns).fill(w);
  arr[columns - 1] = total - w * (columns - 1);
  return arr;
}
