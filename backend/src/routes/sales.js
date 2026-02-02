
const express = require('express');
const mongoose = require('mongoose');
const Product = require('../models/producto.model');
const Customer = require('../models/Customer');
const Sale = require('../models/Sale');
const { computeDiscount } = require('../domain/discount-engine');

const router = express.Router();

// Utilidad: recalcular subtotal
function recalcSubtotal(items) {
  return items.reduce((acc, it) => acc + Number(it.lineSubtotal || 0), 0);
}

/**
 * POST /api/sales
 * Crea un ticket OPEN (cuenta rápida) con cliente opcional.
 * body: { customerId?: string }
 */
router.post('/', async (req, res) => {
  try {
    const { customerId } = req.body || {};
    let customer = null;

    if (customerId) {
      if (!mongoose.isValidObjectId(customerId)) {
        return res.status(400).json({ error: 'customerId inválido' });
      }
      customer = await Customer.findById(customerId);
      if (!customer) return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    const sale = await Sale.create({
      customerId: customer ? customer._id : undefined,
      status: 'OPEN',
      items: [],
      subtotal: 0,
      discountPercent: 0,
      discountAmount: 0,
      total: 0,
    });

    res.status(201).json(sale);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'No se pudo crear el ticket', detail: err.message });
  }
});

/**
 * PATCH /api/sales/:id/items
 * Agrega o quita items de un ticket OPEN.
 * body: { action: 'add'|'remove', productId, quantity }
 * - add: suma la cantidad; si no existe la línea, la crea.
 * - remove: resta la cantidad; si llega a 0 o menos, elimina la línea.
 */
router.patch('/:id/items', async (req, res) => {
  try {
    const { id } = req.params;
    const { action, productId, quantity } = req.body || {};

    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ error: 'saleId inválido' });
    if (!['add', 'remove'].includes(action)) return res.status(400).json({ error: 'action inválida' });
    if (!mongoose.isValidObjectId(productId)) return res.status(400).json({ error: 'productId inválido' });
    if (!Number.isInteger(quantity) || quantity <= 0) return res.status(400).json({ error: 'quantity debe ser entero positivo' });

    const sale = await Sale.findById(id);
    if (!sale) return res.status(404).json({ error: 'Ticket no encontrado' });
    if (sale.status !== 'OPEN') return res.status(409).json({ error: 'Solo se puede editar un ticket OPEN' });

    const product = await Product.findById(productId);
    if (!product || !product.isActive) return res.status(404).json({ error: 'Producto no encontrado o inactivo' });

    // Buscar línea existente
    const idx = sale.items.findIndex(it => String(it.productId) === String(productId));

    if (action === 'add') {
      if (idx === -1) {
        sale.items.push({
          productId: product._id,
          name: product.name,
          quantity: quantity,
          unitPrice: product.price,
          lineSubtotal: quantity * product.price,
        });
      } else {
        sale.items[idx].quantity += quantity;
        sale.items[idx].lineSubtotal = sale.items[idx].quantity * sale.items[idx].unitPrice;
      }
    } else if (action === 'remove') {
      if (idx === -1) {
        return res.status(404).json({ error: 'La línea no existe en el ticket' });
      }
      sale.items[idx].quantity -= quantity;
      if (sale.items[idx].quantity <= 0) {
        sale.items.splice(idx, 1);
      } else {
        sale.items[idx].lineSubtotal = sale.items[idx].quantity * sale.items[idx].unitPrice;
      }
    }

    sale.subtotal = recalcSubtotal(sale.items);
    // aún no aplicamos descuento, solo se calcula al pagar (o para vista previa aparte)
    sale.total = sale.subtotal; // temporal

    await sale.save();
    res.json(sale);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'No se pudo actualizar items', detail: err.message });
  }
});

/**
 * GET /api/sales/open
 * Lista tickets en espera (OPEN) con info básica.
 */
router.get('/open', async (_req, res) => {
  try {
    const tickets = await Sale.find({ status: 'OPEN' })
      .sort({ updatedAt: -1 })
      .select({ items: 1, subtotal: 1, total: 1, createdAt: 1 });
    res.json(tickets);
  } catch (err) {
    res.status(500).json({ error: 'No se pudo obtener tickets', detail: err.message });
  }
});

/**
 * GET /api/sales/:id
 * Recupera un ticket (para continuar venta).
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ error: 'saleId inválido' });

    const sale = await Sale.findById(id);
    if (!sale) return res.status(404).json({ error: 'Ticket no encontrado' });
    res.json(sale);
  } catch (err) {
    res.status(500).json({ error: 'No se pudo recuperar ticket', detail: err.message });
  }
});

/**
 * POST /api/sales/:id/pay
 * Cierra la venta (PAID), aplicando descuento y calculando totales.
 * body: { customerId?: string }
 * - Si hay customerId, actualiza purchasesCount y aplica reglas.
 */
router.post('/:id/pay', async (req, res) => {
  try {
    const { id } = req.params;
    let { customerId } = req.body || {};

    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ error: 'saleId inválido' });

    const sale = await Sale.findById(id);
    if (!sale) return res.status(404).json({ error: 'Ticket no encontrado' });
    if (sale.status !== 'OPEN') return res.status(409).json({ error: 'El ticket no está OPEN' });
    if (!sale.items?.length) return res.status(400).json({ error: 'El ticket no tiene items' });

    let customer = null;
    if (customerId) {
      if (!mongoose.isValidObjectId(customerId)) return res.status(400).json({ error: 'customerId inválido' });
      customer = await Customer.findById(customerId);
      if (!customer) return res.status(404).json({ error: 'Cliente no encontrado' });
    } else if (sale.customerId) {
      customer = await Customer.findById(sale.customerId);
      customerId = customer?._id?.toString();
    }

    // Recalcular subtotal por seguridad
    sale.subtotal = recalcSubtotal(sale.items);

    let discountPercent = 0;
    if (customer) {
      const { discountPercent: d } = await computeDiscount({
        purchasesCount: customer.purchasesCount,
        customerId: customer._id,
      });
      discountPercent = d;
    }
    sale.discountPercent = discountPercent;
    sale.discountAmount = Number(((sale.subtotal * discountPercent) / 100).toFixed(2));
    sale.total = Number((sale.subtotal - sale.discountAmount).toFixed(2));
    sale.status = 'PAID';

    // Persistir
    await sale.save();

    // Si hay cliente, incrementar purchasesCount
    if (customer) {
      customer.purchasesCount = (customer.purchasesCount || 0) + 1;
      await customer.save();
    }

    res.json(sale);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'No se pudo cerrar la venta', detail: err.message });
  }
});

module.exports = router;
