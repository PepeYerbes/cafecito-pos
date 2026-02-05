import { Router } from 'express';
import { auth } from '../middlewares/auth.js';
import { requireopenCash } from '../middlewares/requireopenCash.js';
import Product from '../models/Product.js';
import Sale from '../models/Sale.js';
import Return from '../models/Return.js';
import CashMovement from '../models/CashMovement.js';
import { decreaseStock, increaseStock } from '../services/inventory.js';

const router = Router();

// Helper: calcular líneas
function buildSaleItems(inputItems) {
  return inputItems.map(it => {
    const quantity = Number(it.quantity);
    const unitPrice = Number(it.unitPrice);
    const taxRate = Number(it.taxRate ?? 0.16);
    const subtotal = unitPrice * quantity;
    const tax = subtotal * taxRate;
    const total = subtotal + tax;
    return {
      productId: it.productId,
      name: it.name,
      quantity,
      unitPrice,
      taxRate,
      subtotal,
      tax,
      total
    };
  });
}

// POST /sales   (crea venta simple)
router.post('/', auth, requireopenCash, async (req, res) => {
  const { items, paidWith, discount = 0, notes = '' } = req.body;
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: 'Items requeridos' });
  }

  // Obtener datos de productos si no vienen name/price
  const productsMap = {};
  for (const it of items) {
    const p = await Product.findById(it.productId);
    if (!p) return res.status(400).json({ message: `Producto no encontrado ${it.productId}` });
    productsMap[it.productId] = p;
  }

  const enriched = items.map(it => ({
    productId: it.productId,
    name: productsMap[it.productId].name,
    quantity: it.quantity,
    unitPrice: productsMap[it.productId].price,
    taxRate: productsMap[it.productId].taxRate ?? 0.16
  }));

  const saleItems = buildSaleItems(enriched);

  const gross = saleItems.reduce((a,i)=>a+i.subtotal,0);
  const taxes = saleItems.reduce((a,i)=>a+i.tax,0);
  const itemsTotal = saleItems.reduce((a,i)=>a+i.total,0); // gross + taxes

  const disc = Number(discount) || 0;
  if (disc < 0) return res.status(400).json({ message: 'Descuento inválido' });
  if (disc > itemsTotal) return res.status(400).json({ message: 'Descuento no puede ser mayor al total' });

  // Stock
  await decreaseStock(saleItems);

  const total = Math.max(0, itemsTotal - disc);

  const sale = await Sale.create({
    sessionId: req.session._id,
    userId: req.user.id,
    items: saleItems,
    gross,
    taxes,
    discount: disc,
    total,
    notes: String(notes || ''),
    paidWith
  });

  res.json(sale);
});

// POST /sales/:id/cancel   (cancelación total)
router.post('/:id/cancel', auth, requireopenCash, async (req, res) => {
  const sale = await Sale.findById(req.params.id);
  if (!sale) return res.status(404).json({ message: 'Venta no encontrada' });
  if (sale.status !== 'COMPLETED') return res.status(400).json({ message: 'No se puede cancelar en estado actual' });

  // Reponer stock
  const items = sale.items.map(i => ({ productId: i.productId, quantity: i.quantity }));
  await increaseStock(items);

  sale.status = 'CANCELLED';
  await sale.save();

  // Si fue CASH, refleja como salida? (opcional; en cancelación antes de corte, podemos descontar de netSales sin movimiento aparte)
  // Aquí NO generamos movimiento, se ajusta en expected por ventas netas.

  res.json({ message: 'Venta cancelada', sale });
});

// POST /sales/:id/return   (devolución parcial/total)
router.post('/:id/return', auth, requireopenCash, async (req, res) => {
  const { items, reason } = req.body; // items: [{productId, quantity}]
  const sale = await Sale.findById(req.params.id);
  if (!sale) return res.status(404).json({ message: 'Venta no encontrada' });
  if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ message: 'Items requeridos' });

  // Validar cantidades
  const saleQtyMap = {};
  sale.items.forEach(i => saleQtyMap[String(i.productId)] = (saleQtyMap[String(i.productId)] || 0) + i.quantity);

  for (const it of items) {
    const maxQty = saleQtyMap[String(it.productId)] || 0;
    if (it.quantity <= 0 || it.quantity > maxQty) {
      return res.status(400).json({ message: `Cantidad inválida para producto ${it.productId}` });
    }
  }

// Factor para aplicar descuento proporcionalmente al monto original de items
const sumLineTotals = sale.items.reduce((a, i) => a + (i.total || 0), 0);
const paidTotal = Number(sale.total || 0);
const factor = sumLineTotals > 0 ? (paidTotal / sumLineTotals) : 1; // 0..1

  // Calcular monto de reembolso proporcional
 let refundAmount = 0;
for (const it of items) {
  const line = sale.items.find(si => String(si.productId) === String(it.productId));
  const unitTotal = (line.total / line.quantity) * factor; // ✅ aplica descuento proporcional
  refundAmount += unitTotal * it.quantity;
}

  // Reponer stock
  await increaseStock(items);

  // Registrar Return
  const ret = await Return.create({
    saleId: sale._id,
    sessionId: req.session._id,
    items: items.map(it => {
  const line = sale.items.find(si => String(si.productId) === String(it.productId));
  const unitTotal = (line.total / line.quantity) * factor;
  return { productId: it.productId, quantity: it.quantity, amount: unitTotal * it.quantity };
}),
    reason,
    refundAmount
  });

  // Si pago fue CASH, registrar movimiento OUT
  if (sale.paidWith === 'CASH') {
    await CashMovement.create({
      sessionId: req.session._id,
      type: 'OUT',
      reason: 'REFUND',
      amount: refundAmount,
      note: `Reembolso venta ${sale._id}`
    });
  }

  // Actualizar estado de venta
  const totalRefunds = (await Return.find({ saleId: sale._id }))
    .reduce((a,r)=>a+(r.refundAmount||0),0);

  if (totalRefunds >= sale.total - 0.005) {
    sale.status = 'REFUNDED_FULL';
  } else {
    sale.status = 'REFUNDED_PARTIAL';
  }
  await sale.save();

  res.json({ message: 'Devolución registrada', return: ret, sale });
});

export default router;