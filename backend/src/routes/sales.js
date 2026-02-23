// backend/src/routes/sales.js
import { Router } from 'express';
import { auth } from '../middlewares/auth.js';
import { requireopenCash } from '../middlewares/requireOpenCash.js';
import Product from '../models/Product.js';
import Sale from '../models/Sale.js';
import Order from '../models/Order.js';
import Return from '../models/Return.js';
import CashMovement from '../models/CashMovement.js';
import Customer from '../models/Customer.js';
import { decreaseStock, increaseStock } from '../services/inventory.js';
import { buildSaleTicketPDF } from '../services/pdf/tickets.js';
import { buildKitchenTicketPDF } from '../services/pdf/kitchenTicket.js';

const router = Router();

// Helper: calcular líneas
function buildSaleItems(inputItems) {
  return inputItems.map(it => {
    const quantity  = Number(it.quantity);
    const unitPrice = Number(it.unitPrice);
    const taxRate   = Number(it.taxRate ?? 0.16);
    const subtotal  = unitPrice * quantity;
    const tax       = subtotal * taxRate;
    const total     = subtotal + tax;
    return { productId: it.productId, name: it.name, quantity, unitPrice, taxRate, subtotal, tax, total };
  });
}

// ─────────────────────────────────────────────
// GET /sales/:id/ticket  → PDF ticket de venta
// ─────────────────────────────────────────────
router.get('/:id/ticket', auth, async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.id).lean();
    if (!sale) return res.status(404).json({ message: 'Venta no encontrada' });

    await buildSaleTicketPDF(res, {
      sale,
      store: {
        name:    process.env.STORE_NAME    || 'Cafecito Feliz',
        address: process.env.STORE_ADDRESS || 'Sucursal única'
      }
    });
  } catch (err) {
    console.error('Error generando ticket PDF:', err);
    if (!res.headersSent) res.status(500).json({ message: 'Error generando ticket' });
  }
});

// ─────────────────────────────────────────────
// GET /sales/:id/kitchen-ticket → PDF cocina
// ─────────────────────────────────────────────
router.get('/:id/kitchen-ticket', auth, async (req, res) => {
  try {
    const order = await Order.findOne({ saleId: req.params.id }).lean();
    if (!order) return res.status(404).json({ message: 'Orden de cocina no encontrada' });

    const buffer = await buildKitchenTicketPDF(order, {
      store: { name: process.env.STORE_NAME || 'Cafecito Feliz' }
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="cocina-${order._id}.pdf"`);
    return res.send(buffer);
  } catch (err) {
    console.error('Error generando ticket de cocina:', err);
    if (!res.headersSent) res.status(500).json({ message: 'Error generando ticket de cocina' });
  }
});

// ─────────────────────────────────────────────
// POST /sales   (crea venta + orden de cocina)
// ─────────────────────────────────────────────
router.post('/', auth, requireopenCash, async (req, res) => {
  const { items, paidWith, discount = 0, notes = '', customerId } = req.body || {};

  if (!Array.isArray(items) || items.length === 0)
    return res.status(400).json({ message: 'Items requeridos' });
  if (!['CASH', 'CARD', 'MIXED'].includes(paidWith))
    return res.status(400).json({ message: 'paidWith inválido' });

  // Cargar productos
  const productsMap = {};
  for (const it of items) {
    const p = await Product.findById(it.productId);
    if (!p) return res.status(400).json({ message: `Producto no encontrado ${it.productId}` });
    productsMap[it.productId] = p;
  }

  const enriched = items.map(it => ({
    productId: it.productId,
    name:      productsMap[it.productId].name,
    quantity:  it.quantity,
    unitPrice: productsMap[it.productId].price,
    taxRate:   productsMap[it.productId].taxRate ?? 0.16,
    note:      it.note || ''   // ✅ nota por ítem desde el carrito
  }));

  const saleItems  = buildSaleItems(enriched);
  const gross      = saleItems.reduce((a, i) => a + i.subtotal, 0);
  const taxes      = saleItems.reduce((a, i) => a + i.tax, 0);
  const itemsTotal = saleItems.reduce((a, i) => a + i.total, 0);

  const disc = Number(discount) || 0;
  if (disc < 0)          return res.status(400).json({ message: 'Descuento inválido' });
  if (disc > itemsTotal) return res.status(400).json({ message: 'Descuento no puede ser mayor al total' });

  await decreaseStock(saleItems);

  const total = Math.max(0, itemsTotal - disc);

  // Crear venta
  const sale = await Sale.create({
    sessionId:  req.session._id,
    userId:     req.user.id,
    customerId: customerId || undefined,
    items:      saleItems,
    gross, taxes,
    discount: disc,
    total,
    notes:    String(notes || ''),
    paidWith
  });

  // ✅ Crear orden de cocina automáticamente
  try {
    await Order.create({
      saleId:    sale._id,
      sessionId: req.session._id,
      cashier:   req.user?.name || req.user?.email || 'Cajero',
      notes:     String(notes || ''),
      items: enriched.map(it => ({
        productId: it.productId,
        name:      it.name,
        quantity:  it.quantity,
        note:      it.note || ''
      }))
    });
  } catch (orderErr) {
    // No fallamos la venta si la orden de cocina falla — solo logueamos
    console.error('⚠ Error creando orden de cocina (la venta sí se guardó):', orderErr.message);
  }

  // Lealtad
  if (customerId) {
    const rate   = parseFloat(process.env.LOYALTY_POINTS_PER_MXN || '0.05');
    const earned = Math.floor(total * rate);
    const c      = await Customer.findById(customerId);
    if (c) {
      c.points      = Math.max(0, (c.points || 0) + earned);
      c.totalSpent  = (c.totalSpent  || 0) + total;
      c.visitsCount = (c.visitsCount || 0) + 1;
      c.lastVisit   = new Date();
      await c.save();
    }
  }

  res.json(sale);
});

// ─────────────────────────────────────────────
// POST /sales/:id/cancel
// ─────────────────────────────────────────────
router.post('/:id/cancel', auth, requireopenCash, async (req, res) => {
  const sale = await Sale.findById(req.params.id);
  if (!sale) return res.status(404).json({ message: 'Venta no encontrada' });
  if (sale.status !== 'COMPLETED') return res.status(400).json({ message: 'No se puede cancelar en estado actual' });

  const items = sale.items.map(i => ({ productId: i.productId, quantity: i.quantity }));
  await increaseStock(items);

  sale.status = 'CANCELLED';
  await sale.save();

  // Marcar la orden de cocina como cancelada si existe
  await Order.findOneAndUpdate({ saleId: sale._id }, { status: 'DONE' }).catch(() => {});

  res.json({ message: 'Venta cancelada', sale });
});

// ─────────────────────────────────────────────
// POST /sales/:id/return
// ─────────────────────────────────────────────
router.post('/:id/return', auth, requireopenCash, async (req, res) => {
  const { items, reason } = req.body;
  const sale = await Sale.findById(req.params.id);
  if (!sale) return res.status(404).json({ message: 'Venta no encontrada' });
  if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ message: 'Items requeridos' });

  const saleQtyMap = {};
  sale.items.forEach(i => saleQtyMap[String(i.productId)] = (saleQtyMap[String(i.productId)] || 0) + i.quantity);

  for (const it of items) {
    const maxQty = saleQtyMap[String(it.productId)] || 0;
    if (it.quantity <= 0 || it.quantity > maxQty)
      return res.status(400).json({ message: `Cantidad inválida para producto ${it.productId}` });
  }

  const sumLineTotals = sale.items.reduce((a, i) => a + (i.total || 0), 0);
  const paidTotal     = Number(sale.total || 0);
  const factor        = sumLineTotals > 0 ? (paidTotal / sumLineTotals) : 1;

  let refundAmount = 0;
  for (const it of items) {
    const line     = sale.items.find(si => String(si.productId) === String(it.productId));
    const unitTotal = (line.total / line.quantity) * factor;
    refundAmount   += unitTotal * it.quantity;
  }

  await increaseStock(items);

  const ret = await Return.create({
    saleId:    sale._id,
    sessionId: req.session._id,
    items: items.map(it => {
      const line      = sale.items.find(si => String(si.productId) === String(it.productId));
      const unitTotal = (line.total / line.quantity) * factor;
      return { productId: it.productId, quantity: it.quantity, amount: unitTotal * it.quantity };
    }),
    reason,
    refundAmount
  });

  if (sale.paidWith === 'CASH') {
    await CashMovement.create({
      sessionId: req.session._id,
      type:      'OUT',
      reason:    'REFUND',
      amount:    refundAmount,
      note:      `Reembolso venta ${sale._id}`
    });
  }

  const totalRefunds = (await Return.find({ saleId: sale._id }))
    .reduce((a, r) => a + (r.refundAmount || 0), 0);

  sale.status = (totalRefunds >= sale.total - 0.005) ? 'REFUNDED_FULL' : 'REFUNDED_PARTIAL';
  await sale.save();

  res.json({ message: 'Devolución registrada', return: ret, sale });
});

export default router;