const mongoose = require('mongoose');
const Venta = require('../models/Sale');
const Producto = require('../models/Product');

// Config: define si aplicas IVA
const IVA_PORC = 0.16; // pon 0.16 si quieres IVA 16%

// util folio simple (YYYYMMDD-HHmmss-rand)
function generarFolio() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const stamp = `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${stamp}-${rand}`;
}

exports.crear = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { items, pagos, descuentos = 0, notas } = req.body;
    // items: [{ productId, qty }]
    // pagos: [{ metodo: 'EFECTIVO'|'TARJETA'|'MIXTO', monto }]

    if (!Array.isArray(items) || items.length === 0) {
      throw new Error('La venta requiere al menos un producto');
    }
    if (!Array.isArray(pagos) || pagos.length === 0) {
      throw new Error('Debes incluir al menos un pago');
    }

    // Traer productos y validar stock
    const productIds = items.map(i => i.productId);
    const productos = await Producto.find({ _id: { $in: productIds } }).session(session);
    const mapProd = new Map(productos.map(p => [String(p._id), p]));

    // Construir detalles y subtotal
    const detalles = [];
    let subtotal = 0;

    for (const it of items) {
      const p = mapProd.get(String(it.productId));
      if (!p) throw new Error(`Producto no encontrado: ${it.productId}`);
      if (it.qty <= 0) throw new Error(`Cantidad inválida para ${p.nombre}`);
      if (p.stock < it.qty) throw new Error(`Stock insuficiente para ${p.nombre}. Stock: ${p.stock}, solicitado: ${it.qty}`);

      const totalLinea = p.precio * it.qty;
      subtotal += totalLinea;

      detalles.push({
        producto: p._id,
        nombre: p.nombre,
        precio: p.precio,
        qty: it.qty,
        total: totalLinea
      });
    }

    const desc = Math.max(0, descuentos || 0);
    const base = Math.max(0, subtotal - desc);
    const impuestos = IVA_PORC > 0 ? +(base * IVA_PORC).toFixed(2) : 0;
    const total = +(base + impuestos).toFixed(2);

    const pagado = pagos.reduce((acc, p) => acc + (p.monto || 0), 0);
    if (pagado + 1e-6 < total) { // pequeña tolerancia
      throw new Error(`Monto pagado (${pagado}) menor que total (${total})`);
    }
    const cambio = +(pagado - total).toFixed(2);

    // Decrementar inventario
    for (const it of items) {
      await Producto.updateOne(
        { _id: it.productId, stock: { $gte: it.qty } },
        { $inc: { stock: -it.qty } },
        { session }
      );
      // Opcional: verifica modifiedCount para asegurar que decrementó.
    }

    // Crear Venta
    const venta = await Venta.create([{
      folio: generarFolio(),
      detalles,
      subtotal: +subtotal.toFixed(2),
      descuentos: +desc.toFixed(2),
      impuestos,
      total,
      pagos,
      cambio,
      notas
    }], { session });

    await session.commitTransaction();
    res.status(201).json(venta[0]);
  } catch (err) {
    await session.abortTransaction();
    res.status(400).json({ message: 'No se pudo crear la venta', error: err.message });
  } finally {
    session.endSession();
  }
};

exports.listar = async (req, res) => {
  try {
    const { page = 1, limit = 10, desde, hasta, q } = req.query;
    const filtros = {};
    if (desde || hasta) {
      filtros.fecha = {};
      if (desde) filtros.fecha.$gte = new Date(desde);
      if (hasta) filtros.fecha.$lte = new Date(hasta);
    }
    if (q) {
      filtros.folio = { $regex: q, $options: 'i' };
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = Math.min(parseInt(limit, 10) || 10, 100);
    const skip = (pageNum - 1) * limitNum;

    const [items, total] = await Promise.all([
      Venta.find(filtros).sort({ fecha: -1 }).skip(skip).limit(limitNum).lean(),
      Venta.countDocuments(filtros)
    ]);

    res.json({ data: items, page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) });
  } catch (err) {
    res.status(500).json({ message: 'Error listando ventas', error: err.message });
  }
};

exports.obtenerPorId = async (req, res) => {
  try {
    const venta = await Venta.findById(req.params.id).lean();
    if (!venta) return res.status(404).json({ message: 'Venta no encontrada' });
    res.json(venta);
  } catch (err) {
    res.status(400).json({ message: 'ID inválido', error: err.message });
  }
};