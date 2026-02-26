import { Router } from 'express';
import mongoose from 'mongoose';
import { auth } from '../middlewares/auth.js';
import { requireopenCash } from '../middlewares/requireOpenCash.js';
import Product from '../models/Product.js';
import KitchenOrder from '../models/KitchenOrder.js';
import Customer from '../models/Customer.js';

const r = Router();

// POST /api/orders — crear comanda (no cobra, no toca stock)
r.post('/', auth, requireopenCash, async (req, res) => {
  try {
    const { items, notes, customerId } = req.body || {};
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(422).json({
        error: 'Validation failed',
        details: [{ field: 'items', message: 'items cannot be empty (minimum 1 item required)' }]
      });
    }

    // Valida cantidades y existencia de productos
    const errDetails = [];
    const ids = [];
    items.forEach((it, idx) => {
      if (!it?.productId) errDetails.push({ field: `items[${idx}].productId`, message: 'productId is required' });
      const q = Number(it?.quantity);
      if (!Number.isInteger(q) || q < 1) {
        errDetails.push({ field: `items[${idx}].quantity`, message: 'quantity must be a positive integer (≥ 1)' });
      }
      if (it?.productId) ids.push(String(it.productId));
    });
    if (errDetails.length) return res.status(422).json({ error: 'Validation failed', details: errDetails });

    // Productos
    const products = await Product.find({ _id: { $in: ids } }).lean();
    const map = new Map(products.map(p => [String(p._id), p]));
    const missing = ids.filter(id => !map.has(id));
    if (missing.length) {
      return res.status(400).json({
        error: 'Product not found',
        details: missing.map(id => ({ productId: id, message: 'Product does not exist' }))
      });
    }

    // Cliente (si viene)
    let customer = null;
    if (customerId) {
      if (!mongoose.isValidObjectId(customerId)) {
        return res.status(400).json({ error: 'Customer not found', details: [{ customerId, message: 'Invalid customer id' }] });
      }
      customer = await Customer.findById(customerId);
      if (!customer) {
        return res.status(400).json({ error: 'Customer not found', details: [{ customerId, message: 'Customer does not exist' }] });
      }
    }

    // Construir ítems con nombre para que la cocina sepa qué preparar
    const koItems = items.map(it => ({
      productId: it.productId,
      name: map.get(String(it.productId)).name,
      quantity: Number(it.quantity),
      note: String(it.note || '')
    }));

    // Ticket simple (timestamp corto). Puedes cambiar a secuencial por día.
    const ticket = `K-${Date.now().toString().slice(-6)}`;

    const order = await KitchenOrder.create({
      sessionId: req.session._id,
      userId: req.user.id,
      customerId: customer ? customer._id : undefined,
      items: koItems,
      notes: String(notes || ''),
      ticket,
      status: 'NEW'
    });

    res.status(201).json(order);
  } catch (err) {
    console.error('Crear KitchenOrder error', err);
    res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
});

// GET /api/orders?status=NEW|IN_PROGRESS|READY
r.get('/', auth, async (req, res) => {
  try {
    const { status } = req.query;
    const q = {};
    if (status) q.status = String(status).toUpperCase();
    const items = await KitchenOrder.find(q).sort({ createdAt: 1 }).lean();
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
});

// PATCH /api/orders/:id/status  { status: 'IN_PROGRESS'|'READY'|'DELIVERED'|'CANCELLED' }
r.patch('/:id/status', auth, async (req, res) => {
  try {
    const id = String(req.params.id || '');
    const { status } = req.body || {};
    const allowed = new Set(['NEW','IN_PROGRESS','READY','DELIVERED','CANCELLED']);
    const next = String(status || '').toUpperCase();
    if (!allowed.has(next)) {
      return res.status(422).json({
        error: 'Validation failed',
        details: [{ field: 'status', message: 'Invalid status value' }]
      });
    }
    const order = await KitchenOrder.findByIdAndUpdate(id, { $set: { status: next } }, { new: true });
    if (!order) return res.status(404).json({ error: 'Order not found', id });
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
});

export default r;