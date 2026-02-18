// backend/src/routes/sales.js
import { Router } from 'express';
import mongoose from 'mongoose';
import Sale from '../models/Sale.js';
import { calculateDiscountPercent } from '../services/discount.service.js';

// Ajusta si tus modelos tienen otra ruta/nombre
import Product from '../models/Product.js';
import Customer from '../models/Customer.js';

// Usa tu middleware real de JWT
import { auth } from '../middlewares/auth.js';

const router = Router();

/** ---- Roles ---- **/
const ROLES = Object.freeze({ ADMIN: 'ADMIN', SELLER: 'SELLER' });
function requireRoles(allowed) {
  const set = new Set(Array.isArray(allowed) ? allowed : [allowed]);
  return (req, res, next) => {
    const role = req.user?.role;
    if (!role) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Missing or invalid authorization token'
      });
    }
    if (!set.has(role)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        message: 'Operation not allowed for this role'
      });
    }
    next();
  };
}

/** ---- Helpers ---- **/
function isValidObjectId(v) {
  try { return new mongoose.Types.ObjectId(v).toString() === String(v); }
  catch { return false; }
}

/** ---- POST /api/sales (ADMIN|SELLER) ---- **/
router.post(
  '/',
  auth,                                  // JWT obligatorio
  requireRoles([ROLES.ADMIN, ROLES.SELLER]),
  async (req, res, next) => {
    try {
      const body = req.body ?? {};
      const items = Array.isArray(body.items) ? body.items : [];
      const customerId = body.customerId;
      const paymentMethod = body.paymentMethod ?? 'cash';

      // Validaciones
      const details = [];
      if (!items.length) details.push({ field: 'items', message: 'items cannot be empty' });

      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        if (!it?.productId) details.push({ field: `items[${i}].productId`, message: 'productId is required' });
        if (it?.quantity == null) details.push({ field: `items[${i}].quantity`, message: 'quantity is required' });
        else if (!Number.isInteger(it.quantity) || it.quantity < 1)
          details.push({ field: `items[${i}].quantity`, message: 'quantity must be >= 1' });
        if (it?.productId && !isValidObjectId(it.productId))
          details.push({ field: `items[${i}].productId`, message: 'Invalid ObjectId' });
      }
      if (customerId && !isValidObjectId(customerId)) {
        details.push({ field: 'customerId', message: 'Invalid ObjectId' });
      }
      if (details.length) return next({ code: 'VALIDATION_ERROR', details });

      // Cliente (opcional)
      let customerDoc = null;
      if (customerId) {
        customerDoc = await Customer.findById(customerId);
        if (!customerDoc) return res.status(404).json({ error: 'Customer not found', id: customerId });
      }

      // Productos
      const productIds = items.map(i => i.productId);
      const products = await Product.find({ _id: { $in: productIds } });

      // Faltantes → 404
      const foundSet = new Set(products.map(p => String(p._id)));
      const missing = productIds.find(id => !foundSet.has(String(id)));
      if (missing) return res.status(404).json({ error: 'Product not found', id: missing });

      // Stock + líneas
      const lines = items.map(it => {
        const p = products.find(pp => String(pp._id) === String(it.productId));
        const q = it.quantity;
        if (q > p.stock) {
          return { insufficient: true, productId: String(p._id), available: p.stock, requested: q, p };
        }
        const unitPrice = Number(p.price);
        const lineTotal = Number((unitPrice * q).toFixed(2));
        return {
          product_id: p._id,
          product_name: p.name,
          quantity: q,
          unit_price: unitPrice,
          line_total: lineTotal,
          p,
        };
      });

      const insufficient = lines.find(l => l.insufficient);
      if (insufficient) {
        return res.status(400).json({
          error: 'Insufficient stock',
          details: [{ productId: insufficient.productId, message: `Only ${insufficient.available} available, requested ${insufficient.requested}` }],
        });
      }

      // Totales
      const subtotal = Number(lines.reduce((acc, l) => acc + l.line_total, 0).toFixed(2));
      const discountPercent = calculateDiscountPercent(customerDoc?.purchases_count ?? 0);
      const discountAmount = Number(((discountPercent / 100) * subtotal).toFixed(2));
      const total = Number((subtotal - discountAmount).toFixed(2));
      const now = new Date();

      // Transacción
      const session = await mongoose.startSession();
      let saleDoc;
      await session.withTransaction(async () => {
        // Venta
        const created = await Sale.create([{
          customer_id: customerDoc ? customerDoc._id : null,
          payment_method: paymentMethod,
          items: lines.map(l => ({
            product_id: l.product_id,
            product_name: l.product_name,
            quantity: l.quantity,
            unit_price: l.unit_price,
            line_total: l.line_total,
          })),
          subtotal,
          discount_percent: discountPercent,
          discount_amount: discountAmount,
          total,
          created_at: now,
        }], { session });
        saleDoc = created[0];

        // Stock
        const bulk = lines.map(l => ({
          updateOne: {
            filter: { _id: l.product_id },
            update: { $inc: { stock: -l.quantity }, $set: { updated_at: now } },
          },
        }));
        if (bulk.length) await Product.bulkWrite(bulk, { session });

        // purchases_count
        if (customerDoc) {
          await Customer.updateOne(
            { _id: customerDoc._id },
            { $inc: { purchases_count: 1 }, $set: { updated_at: now } },
            { session }
          );
        }
      });
      await session.endSession();

      // Respuesta con ticket
      return res.status(201).json({
        saleId: String(saleDoc._id),
        customerId: customerDoc ? String(customerDoc._id) : null,
        paymentMethod: saleDoc.payment_method,
        items: saleDoc.items.map(l => ({
          productId: String(l.product_id),
          productName: l.product_name,
          quantity: l.quantity,
          unitPrice: l.unit_price,
          lineTotal: l.line_total,
        })),
        subtotal,
        discountPercent,
        discountAmount,
        total,
        ticket: {
          saleId: String(saleDoc._id),
          timestamp: now.toISOString(),
          storeName: 'Cafecito Feliz',
          items: saleDoc.items.map(l => ({
            name: l.product_name,
            qty: l.quantity,
            unitPrice: l.unit_price,
            lineTotal: l.line_total,
          })),
          subtotal,
          discount: discountPercent ? `${discountPercent}% (-$${discountAmount.toFixed(2)})` : '0%',
          total,
          paymentMethod: saleDoc.payment_method,
        },
        createdAt: now.toISOString(),
      });
    } catch (err) {
      return next(err);
    }
  }
);

/** ---- GET /api/sales/:id (ADMIN|SELLER) ---- **/
router.get(
  '/:id',
  auth,
  requireRoles([ROLES.ADMIN, ROLES.SELLER]),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      if (!isValidObjectId(id)) {
        return next({ code: 'VALIDATION_ERROR', details: [{ field: 'id', message: 'Invalid ObjectId' }] });
      }

      const sale = await Sale.findById(id);
      if (!sale) return res.status(404).json({ error: 'Sale not found', id });

      const ticketTime = sale.created_at ?? new Date();
      return res.json({
        saleId: String(sale._id),
        customerId: sale.customer_id ? String(sale.customer_id) : null,
        paymentMethod: sale.payment_method,
        items: sale.items.map(l => ({
          productId: String(l.product_id),
          productName: l.product_name,
          quantity: l.quantity,
          unitPrice: l.unit_price,
          lineTotal: l.line_total,
        })),
        subtotal: sale.subtotal,
        discountPercent: sale.discount_percent,
        discountAmount: sale.discount_amount,
        total: sale.total,
        ticket: {
          saleId: String(sale._id),
          timestamp: ticketTime.toISOString(),
          storeName: 'Cafecito Feliz',
          items: sale.items.map(l => ({
            name: l.product_name,
            qty: l.quantity,
            unitPrice: l.unit_price,
            lineTotal: l.line_total,
          })),
          subtotal: sale.subtotal,
          discount: sale.discount_percent ? `${sale.discount_percent}% (-$${sale.discount_amount.toFixed(2)})` : '0%',
          total: sale.total,
          paymentMethod: sale.payment_method,
        },
        createdAt: ticketTime.toISOString(),
      });
    } catch (err) {
      return next(err);
    }
  }
);

export default router;