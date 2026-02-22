// backend/src/controllers/cash.controller.js
import mongoose from 'mongoose';
import CashSession from '../models/CashSession.js';
import Sale from '../models/Sale.js';
import { buildSessionPdf } from '../services/pdf/sessionReport.js';

/**
 * Política para pagos MIXED (ajusta a tu operación):
 * - 'COUNT_AS_CASH' → suma MIXED al efectivo esperado.
 * - 'COUNT_AS_CARD' → trata MIXED como tarjeta (no suma al efectivo).
 * - 'IGNORE'        → no suma MIXED al efectivo (por defecto).
 *
 * Puedes ajustar por ENV: process.env.MIXED_CASH_POLICY
 */
const MIXED_CASH_POLICY = (process.env.MIXED_CASH_POLICY || 'IGNORE').toUpperCase();

/** Helpers */
const toMoney = (n) => Number((Number(n || 0)).toFixed(2));
const isNumber = (v) => typeof v === 'number' && !Number.isNaN(v) && Number.isFinite(v);
const errorResponse = (res, code, message) => res.status(code).json({ message });

/**
 * POST /cash/register/open
 * Body: { initialCash: number, userId?: string }
 */
export const open = async (req, res) => {
  try {
    const { initialCash } = req.body;
    const userId = req.user?.id || req.body.userId || 'user-demo';

    if (!isNumber(initialCash) || initialCash < 0) {
      return errorResponse(res, 400, 'initialCash inválido (>= 0 requerido)');
    }

    const existing = await CashSession.findOne({ status: 'OPEN' });
    if (existing) return errorResponse(res, 400, 'Ya hay una sesión abierta');

    const session = await CashSession.create({
      userId,
      initialCash: toMoney(initialCash),
      status: 'OPEN',
      openedAt: new Date(),
      movements: []
    });

    return res.json(session);
  } catch (e) {
    return errorResponse(res, 500, e.message || 'Error al abrir caja');
  }
};

/**
 * GET /cash/register/current
 */
export const current = async (_req, res) => {
  try {
    const s = await CashSession.findOne({ status: 'OPEN' });
    if (!s) return errorResponse(res, 404, 'No hay sesión abierta');
    return res.json(s);
  } catch (e) {
    return errorResponse(res, 500, e.message || 'Error al obtener la sesión actual');
  }
};

/**
 * POST /cash/register/movement
 * Body: { type:'INGRESO'|'EGRESO', amount:number, reason?:string }
 */
export const movement = async (req, res) => {
  try {
    const { type, reason, amount } = req.body;

    if (!['INGRESO', 'EGRESO'].includes(type)) {
      return errorResponse(res, 400, 'type inválido (INGRESO o EGRESO)');
    }
    if (!isNumber(amount) || amount <= 0) {
      return errorResponse(res, 400, 'amount inválido (> 0 requerido)');
    }

    const s = await CashSession.findOne({ status: 'OPEN' });
    if (!s) return errorResponse(res, 400, 'No hay sesión abierta');

    s.movements = s.movements || [];
    s.movements.push({
      type,
      reason: (reason || '').trim(),
      amount: toMoney(amount),
      createdAt: new Date()
    });

    await s.save();
    return res.json(s);
  } catch (e) {
    return errorResponse(res, 500, e.message || 'Error al registrar movimiento');
  }
};

/**
 * POST /cash/register/close
 * Body: { countedCash:number, notes?:string, userId?:string }
 */
export const close = async (req, res) => {
  try {
    const { countedCash, notes } = req.body;
    const userId = req.user?.id || req.body.userId || 'user-demo';

    if (!isNumber(countedCash) || countedCash < 0) {
      return errorResponse(res, 400, 'countedCash inválido (>= 0 requerido)');
    }

    const s = await CashSession.findOne({ status: 'OPEN' });
    if (!s) return errorResponse(res, 400, 'No hay sesión abierta');

    // Ventas COMPLETED asociadas a esta sesión (por tu modelo: sessionId)
    const sales = await Sale.find({ sessionId: s._id, status: 'COMPLETED' });

    // Totales (gross, taxes, discount, total)
    const totals = sales.reduce(
      (acc, v) => {
        acc.gross += Number(v.gross || 0);
        acc.taxes += Number(v.taxes || 0);
        acc.discount += Number(v.discount || 0);
        acc.total += Number(v.total || 0);
        return acc;
      },
      { gross: 0, taxes: 0, discount: 0, total: 0 }
    );

    // Resumen de pagos por método (CASH, CARD, MIXED)
    const paymentsMap = new Map();
    const addPayment = (method, amt) => {
      if (!paymentsMap.has(method)) paymentsMap.set(method, { total: 0, count: 0 });
      const p = paymentsMap.get(method);
      p.total += Number(amt || 0);
      p.count += 1;
    };
    for (const v of sales) {
      addPayment(v.paidWith, v.total || 0);
    }

    const payments = Array.from(paymentsMap.entries()).map(([method, val]) => ({
      method,
      total: toMoney(val.total),
      count: val.count
    }));

    // Movimientos manuales
    const ingresos = (s.movements || [])
      .filter((m) => m.type === 'INGRESO')
      .reduce((a, m) => a + Number(m.amount || 0), 0);

    const egresos = (s.movements || [])
      .filter((m) => m.type === 'EGRESO')
      .reduce((a, m) => a + Number(m.amount || 0), 0);

    // Efectivo de ventas según política MIXED
    const efectivoSoloCash = payments.find((p) => p.method === 'CASH')?.total || 0;
    const totalMixed = payments.find((p) => p.method === 'MIXED')?.total || 0;

    let efectivoVentas = efectivoSoloCash;
    if (MIXED_CASH_POLICY === 'COUNT_AS_CASH') {
      efectivoVentas += totalMixed;
    } // si COUNT_AS_CARD o IGNORE: no suma al efectivo

    const expectedCash = toMoney(Number(s.initialCash || 0) + Number(efectivoVentas) + Number(ingresos) - Number(egresos));
    const difference = toMoney(Number(countedCash) - Number(expectedCash));

    // Cerrar sesión
    s.status = 'CLOSED';
    s.closedAt = new Date();
    s.closedBy = req.user?.id ? new mongoose.Types.ObjectId(req.user.id) : undefined; s.countedCash = toMoney(countedCash);
    s.expectedCash = expectedCash;
    s.difference = difference;
    s.totals = {
      gross: toMoney(totals.gross),
      taxes: toMoney(totals.taxes),
      discount: toMoney(totals.discount),
      total: toMoney(totals.total)
    };
    s.payments = payments;
    s.notes = (notes || '').trim();

    await s.save();
    return res.json(s);
  } catch (e) {
    return errorResponse(res, 500, e.message || 'Error al cerrar caja');
  }
};

/**
 * GET /cash/register/:id/report?format=pdf|json
 */
export const report = async (req, res) => {
  try {
    const { id } = req.params;
    const format = (req.query.format || 'json').toString().toLowerCase();

    if (!mongoose.isValidObjectId(id)) {
      return errorResponse(res, 400, 'ID de sesión inválido');
    }

    const s = await CashSession.findById(id);
    if (!s) return errorResponse(res, 404, 'Sesión no encontrada');

    if (format === 'json') {
      return res.json(s);
    }

    // PDF con branding Cafecito Feliz
    const buffer = await buildSessionPdf(s, {
      company: { name: 'Cafecito Feliz', address: 'Sucursal única' },
      branch: { name: s.branchName || 'Sucursal única' },
      printedBy: req.user?.name || 'Sistema',
      logoPath: 'public/assets/logo.png'
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="cierre-${s._id}.pdf"`);
    return res.send(buffer);
  } catch (e) {
    return errorResponse(res, 500, e.message || 'Error al generar reporte');
  }
};