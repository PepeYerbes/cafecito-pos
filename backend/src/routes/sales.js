// backend/src/routes/sales.js
import { Router } from 'express';
import { auth } from '../middlewares/auth.js';
import { requireopenCash } from '../middlewares/requireOpenCash.js';
import mongoose from 'mongoose';
import Product from '../models/Product.js';
import Sale from '../models/Sale.js';
import Return from '../models/Return.js';
import CashMovement from '../models/CashMovement.js';
import Customer from '../models/Customer.js';
import { decreaseStock, increaseStock } from '../services/inventory.js';

const router = Router();

// Helpers
const isPosInt = (n) => Number.isInteger(n) && n >= 1;
const ALLOWED = new Set(['CASH', 'CARD', 'MIXED', 'TRANSFER']);
const mapPayment = (raw) => {
  if (!raw) return null;
  const s = String(raw).trim().toUpperCase();
  if (s === 'CASH' || s === 'CARD' || s === 'MIXED' || s === 'TRANSFER') return s;
  // alias en minúsculas para compatibilidad
  if (s === 'EFECTIVO') return 'CASH';
  if (s === 'TARJETA') return 'CARD';
  return null;
};

// ===== POST /sales  (crea venta simple, con validaciones nuevas) =====
router.post('/', auth, requireopenCash, async (req, res) => {
  try {
    const body = req.body || {};
    const items = Array.isArray(body.items) ? body.items : [];
    if (items.length === 0) {
      return res.status(422).json({
        error: 'Validation failed',
        details: [{ field: 'items', message: 'items cannot be empty (minimum 1 item required)' }]
      });
    }

    // Validar cantidades (>= 1) y productId presente
    const qtyErrors = [];
    const productIds = new Set();
    items.forEach((it, idx) => {
      if (!it?.productId) {
        qtyErrors.push({ field: `items[${idx}].productId`, message: 'productId is required' });
      }
      if (!isPosInt(Number(it?.quantity))) {
        qtyErrors.push({
          field: `items[${idx}].quantity`,
          message: 'quantity must be a positive integer (greater than or equal to 1)'
        });
      }
      if (it?.productId) productIds.add(String(it.productId));
    });
    if (qtyErrors.length) {
      return res.status(422).json({ error: 'Validation failed', details: qtyErrors });
    }

    // Payment method: aceptar paidWith o paymentMethod
    const rawMethod = body.paidWith ?? body.paymentMethod;
    const paidWith = mapPayment(rawMethod);
    if (!paidWith || !ALLOWED.has(paidWith)) {
      return res.status(422).json({
        error: 'Validation failed',
        details: [{
          field: 'paidWith',
          message: 'paidWith/paymentMethod must be one of: CASH, CARD, MIXED, TRANSFER'
        }]
      });
    }

    // Si se envía customerId, debe existir
    let customer = null;
    if (body.customerId) {
      if (!mongoose.isValidObjectId(body.customerId)) {
        return res.status(400).json({
          error: 'Customer not found',
          details: [{ customerId: String(body.customerId), message: 'Invalid customer id' }]
        });
      }
      customer = await Customer.findById(body.customerId);
      if (!customer) {
        return res.status(400).json({
          error: 'Customer not found',
          details: [{ customerId: String(body.customerId), message: 'Customer does not exist' }]
        });
      }
    }

    // Traer productos de una sola vez
    const ids = Array.from(productIds);
    const products = await Product.find({ _id: { $in: ids } }).lean();
    const byId = new Map(products.map(p => [String(p._id), p]));

    // Validar existencia
    const missing = ids.filter(id => !byId.has(id));
    if (missing.length) {
      return res.status(400).json({
        error: 'Product not found',
        details: missing.map(id => ({ productId: id, message: 'Product does not exist' }))
      });
    }

    // Validar stock suficiente (rechaza toda la venta si alguno no alcanza)
    const insufficient = [];
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const p = byId.get(String(it.productId));
      const requested = Number(it.quantity);
      const available = Number(p.stock || 0);
      if (requested > available) {
        insufficient.push({
          productId: String(p._id),
          productName: p.name || p.nombre,
          available,
          requested,
          message: `Only ${available} available, requested ${requested}`
        });
      }
    }
    if (insufficient.length) {
      return res.status(400).json({ error: 'Insufficient stock', details: insufficient });
    }

    // Construir líneas con precio/tax del producto
    const saleItems = items.map(it => {
      const p = byId.get(String(it.productId));
      const quantity = Number(it.quantity);
      const unitPrice = Number(p.price);
      const taxRate = Number(p.taxRate ?? 0.16);
      const subtotal = unitPrice * quantity;
      const tax = subtotal * taxRate;
      const total = subtotal + tax;
      return {
        productId: it.productId,
        name: p.name,
        quantity, unitPrice, taxRate, subtotal, tax, total
      };
    });

    const gross = saleItems.reduce((a, i) => a + i.subtotal, 0);
    const taxes = saleItems.reduce((a, i) => a + i.tax, 0);
    const itemsTotal = saleItems.reduce((a, i) => a + i.total, 0);

    const disc = Number(body.discount || 0);
    if (disc < 0) {
      return res.status(422).json({
        error: 'Validation failed',
        details: [{ field: 'discount', message: 'discount must be a number ≥ 0' }]
      });
    }
    if (disc > itemsTotal) {
      return res.status(400).json({
        error: 'Business rule violation',
        details: [{ field: 'discount', message: 'discount cannot exceed items total' }]
      });
    }
    const total = Math.max(0, itemsTotal - disc);

    // — Stock: decrementos en batch (condicionados a stock >= qty)
    // Nota: para atomicidad total usa transacciones (Replica Set). Aquí hacemos pre-chequeo + writes condicionados.
    const ops = items.map(it => ({
      updateOne: {
        filter: { _id: it.productId, stock: { $gte: it.quantity } },
        update: { $inc: { stock: -Number(it.quantity) } }
      }
    }));
    const bulk = await Product.bulkWrite(ops, { ordered: true });
    // Verifica que todos modificaron (por condición de carrera)
    const modified = bulk.result?.nModified ?? bulk.modifiedCount ?? 0;
    if (modified !== items.length) {
      // Recupera stocks en caso de falla parcial (best-effort)
      const revertOps = items.map(it => ({
        updateOne: { filter: { _id: it.productId }, update: { $inc: { stock: Number(it.quantity) } } }
      }));
      await Product.bulkWrite(revertOps, { ordered: false }).catch(() => {});
      return res.status(400).json({
        error: 'Insufficient stock',
        details: [{ message: 'Concurrent update detected. Please try again.' }]
      });
    }

    const sale = await Sale.create({
      sessionId: req.session._id,
      userId: req.user.id,
      customerId: customer ? customer._id : undefined,
      items: saleItems,
      gross, taxes, discount: disc, total,
      notes: String(body.notes || ''),
      paidWith
    });

    // Lealtad
    if (customer) {
      const rate = parseFloat(process.env.LOYALTY_POINTS_PER_MXN || '0.05'); // 1 punto c/20 MXN
      const earned = Math.floor(total * rate);
      customer.points = Math.max(0, (customer.points || 0) + earned);
      customer.totalSpent = (customer.totalSpent || 0) + total;
      customer.visitsCount = (customer.visitsCount || 0) + 1;
      customer.lastVisit = new Date();
      await customer.save();
    }

    return res.status(201).json(sale);
  } catch (err) {
    console.error('Error creando venta', err);
    return res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
});

// ===== GET /sales/:id (detalle de venta; 404 si no existe) =====
router.get('/:id', auth, async (req, res) => {
  try {
    const id = String(req.params.id || '');
    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({ error: 'Sale not found', id });
    }
    const sale = await Sale.findById(id).lean();
    if (!sale) return res.status(404).json({ error: 'Sale not found', id });
    res.json(sale);
  } catch (e) {
    res.status(500).json({ error: 'Internal Server Error', message: e.message });
  }
});

export default router;