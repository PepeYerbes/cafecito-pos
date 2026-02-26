import path from 'path';
import User from '../../models/User.js';
import mongoose from 'mongoose';
import fs from 'fs/promises';
import dayjs from 'dayjs';
import CashSession from '../../models/CashSession.js';
import Sale from '../../models/Sale.js';
import CashMovement from '../../models/CashMovement.js';
import ReturnModel from '../../models/Return.js';
import { renderSessionPdf } from './cashSessions.pdf.js';

// 🔹 Política de efectivo para pagos MIXED (ENV):
//    IGNORE (default) | COUNT_AS_CASH | COUNT_AS_CARD
const MIXED_CASH_POLICY = (process.env.MIXED_CASH_POLICY || 'IGNORE').toUpperCase();

const PDF_DIR = path.join(process.cwd(), 'public', 'cierres');
const BRAND = {
  branchName: 'Cafecito Feliz — Sucursal 01',
  colors: {
    dark: '#04151f',
    teal: '#183a37',
    sand: '#efd6ac',
    orange: '#c44900',
    plum: '#432534'
  },
  // 🔸 Ruta ABSOLUTA para Puppeteer (usada como file:///... en la plantilla EJS)
  logoPath: path.join(process.cwd(), 'public', 'assets', 'logo.png')
};

export async function list({ status = 'CLOSED', page = 1, pageSize = 20, from, to }) {
  const q = {};
  if (status) q.status = status;
  if (from || to) {
    q.closedAt = {};
    if (from) q.closedAt.$gte = from;
    if (to) q.closedAt.$lte = to;
  }

  const total = await CashSession.countDocuments(q);
  const items = await CashSession.find(q)
    .sort({ closedAt: -1 })
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .lean();

  return { total, page, pageSize, items };
}

export async function getById(id) {
  return CashSession.findById(id).lean();
}

function pdfPathFor(sessionId) {
  const file = `cierre_${sessionId}.pdf`;
  return { abs: path.join(PDF_DIR, file), rel: path.posix.join('public', 'cierres', file) };
}

export async function ensurePdf(sessionId) {
  const { abs } = pdfPathFor(sessionId);
  try {
    await fs.access(abs);
    return abs;
  } catch {
    // no existe: genera si es CLOSED (o lo permites para pruebas)
    return generatePdf(sessionId).catch(() => null);
  }
}

export async function generatePdf(sessionId) {
  const s = await CashSession.findById(sessionId).lean();
  if (!s) throw new Error('Sesión no encontrada');

  await fs.mkdir(PDF_DIR, { recursive: true });
  const { abs } = pdfPathFor(sessionId);

  await renderSessionPdf({
    session: s,
    brand: BRAND,
    pdfFullPath: abs
  });

  return abs;
}

export async function closeSession({ sessionId, countedCash, notes, closedBy }) {
  const session = await CashSession.findById(sessionId);
  if (!session) throw new Error('Sesión no encontrada');
  if (session.status === 'CLOSED') throw new Error('La sesión ya está cerrada');

  // Ventas válidas de esta sesión
  const allowed = ['COMPLETED', 'REFUNDED_PARTIAL'];
  const salesAgg = await Sale.aggregate([
    { $match: { sessionId: session._id, status: { $in: allowed } } },
    {
      $group: {
        _id: null,
        gross: { $sum: '$gross' },
        taxes: { $sum: '$taxes' },
        discount: { $sum: '$discount' },
        total: { $sum: '$total' },
        count: { $sum: 1 }
      }
    }
  ]);
  const salesTotals = salesAgg[0] || { gross: 0, taxes: 0, discount: 0, total: 0, count: 0 };

  // Pagos por método
 
const payAgg = await Sale.aggregate([
  { $match: { sessionId: session._id, status: { $in: allowed } } },
  { $group: { _id: '$paidWith', total: { $sum: '$total' }, count: { $sum: 1 } } }
]);
const METHODS = ['CASH', 'CARD', 'MIXED', 'TRANSFER'];
const payments = METHODS.map(method => {
  const row = payAgg.find(r => r._id === method);
  return { method, total: row?.total || 0, count: row?.count || 0 };
});

  // Movimientos de caja
  const movementsDocs = await CashMovement.find({ sessionId: session._id }).sort({ createdAt: 1 }).lean();
  const movements = movementsDocs.map(m => ({
    type: m.type,        // 'IN' | 'OUT'
    reason: m.reason,
    amount: m.amount,
    createdAt: m.createdAt
  }));
  const sumIn = movements.filter(m => m.type === 'IN').reduce((a, m) => a + m.amount, 0);
  const sumOut = movements.filter(m => m.type === 'OUT').reduce((a, m) => a + m.amount, 0);

  // Devoluciones (informativo)
  const returnsAgg = await ReturnModel.aggregate([
    { $match: { sessionId: session._id } },
    { $group: { _id: null, count: { $sum: 1 }, refundAmount: { $sum: '$refundAmount' } } }
  ]);
  const returnsSummary = returnsAgg[0] || { count: 0, refundAmount: 0 };


 /** 🔹 Agregación: total de piezas vendidas en la sesión */
  const totalItemsAgg = await Sale.aggregate([
    { $match: { sessionId: session._id, status: { $in: allowed } } },
    { $unwind: '$items' },
    { $group: { _id: null, itemsCount: { $sum: '$items.quantity' } } }
  ]);
  const itemsCount = totalItemsAgg[0]?.itemsCount || 0;

  /** 🔹 Agregación: por vendedor y producto */
  const bySellerProduct = await Sale.aggregate([
    { $match: { sessionId: session._id, status: { $in: allowed } } },
    { $unwind: '$items' },
    {
      $group: {
        _id: { userId: '$userId', productId: '$items.productId', name: '$items.name' },
        qty: { $sum: '$items.quantity' },
        revenue: { $sum: '$items.total' }
      }
    }
  ]);

  // Mapear a estructura por vendedor
  const sellersMap = new Map();
  for (const row of bySellerProduct) {
    const userIdStr = String(row._id.userId || '');
    if (!sellersMap.has(userIdStr)) sellersMap.set(userIdStr, { products: [], totalItems: 0 });
    const s = sellersMap.get(userIdStr);
    s.products.push({
      productId: row._id.productId,
      name: row._id.name,
      qty: row.qty,
      revenue: Math.round((row.revenue || 0) * 100) / 100
    });
    s.totalItems += row.qty;
  }

  // Obtener nombres de usuarios
  const userIds = Array.from(sellersMap.keys()).filter(Boolean);
  const users = await User.find({ _id: { $in: userIds } }).lean();
  const userNameById = new Map(users.map(u => [String(u._id), u.name || u.email || 'Usuario']));

  const sellerSummaries = userIds.map(uid => ({
    userId: new mongoose.Types.ObjectId(uid),
    userName: userNameById.get(uid) || uid,
    totalItems: sellersMap.get(uid)?.totalItems || 0,
    products: (sellersMap.get(uid)?.products || []).sort((a, b) => b.qty - a.qty)
  })).sort((a, b) => b.totalItems - a.totalItems);

  // Persistir en la sesión para que el PDF los tenga disponibles
  session.itemsCount = itemsCount;
  session.sellerSummaries = sellerSummaries;
  

// Expected cash (solo CASH + MIXED si policy=COUNT_AS_CASH)
  const cashSales = payments.find(p => p.method === 'CASH')?.total || 0;
  const mixedSales = payments.find(p => p.method === 'MIXED')?.total || 0;
  const effectiveCash = cashSales + (MIXED_CASH_POLICY === 'COUNT_AS_CASH' ? mixedSales : 0);

  const expectedCash = (session.initialCash || 0) + effectiveCash + sumIn - sumOut;

  session.status = 'CLOSED';
  session.closedAt = new Date();
  if (typeof countedCash === 'number') session.countedCash = countedCash;
  session.expectedCash = expectedCash;
  session.difference = (countedCash ?? 0) - expectedCash;
  session.notes = notes || session.notes || '';
  if (closedBy) session.closedBy = closedBy; // Mongoose castea a ObjectId si corresponde

  // Totales y secciones embebidas
  session.totals = {
    gross: round2(salesTotals.gross),
    taxes: round2(salesTotals.taxes),
    discount: round2(salesTotals.discount),
    total: round2(salesTotals.total)
  };
  session.payments = payments.map(p => ({ method: p.method, total: round2(p.total), count: p.count }));
  session.movements = movements;

  await session.save();

  // Generar PDF
  await generatePdf(String(session._id));

  // Respuesta con datos útiles + resumen de devoluciones (informativo)
  const result = session.toObject();
  result.returns = returnsSummary;
  return result;
}

function round2(n) { return Math.round((n || 0) * 100) / 100; }