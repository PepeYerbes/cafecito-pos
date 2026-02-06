import { Router } from 'express';
import Product from '../models/Product.js';

const router = Router();

const toInt   = (v, d) => (Number.isNaN(parseInt(v, 10)) ? d : parseInt(v, 10));
const toFloat = (v, d) => (Number.isNaN(parseFloat(v)) ? d : parseFloat(v));

router.get('/', async (req, res) => {
  try {
    console.log('[GET /api/productos] query:', req.query);
    const { page = 1, limit = 12, q, categoria, minPrecio, maxPrecio, activo } = req.query;

    const filtros = {};
    if (q) filtros.name = { $regex: String(q), $options: 'i' };
    if (categoria) filtros.categoria = categoria;
    if (activo !== undefined) filtros.active = String(activo) === 'true';
    if (minPrecio !== undefined || maxPrecio !== undefined) {
      filtros.price = {};
      if (minPrecio !== undefined) filtros.price.$gte = toFloat(minPrecio, 0);
      if (maxPrecio !== undefined) filtros.price.$lte = toFloat(maxPrecio, Number.MAX_SAFE_INTEGER);
    }

    const pageNum  = Math.max(1, toInt(page, 1));
    const limitNum = Math.min(100, Math.max(1, toInt(limit, 12)));
    const skip     = (pageNum - 1) * limitNum;

    const [items, total] = await Promise.all([
      Product.find(filtros).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
      Product.countDocuments(filtros)
    ]);

    const mapped = items.map(p => ({
      _id:       String(p._id),
      nombre:    p.nombre ?? p.name,
      precio:    p.precio ?? p.price,
      categoria: p.categoria ?? 'Otro',
      codigo:    p.codigo ?? p.sku,
      stock:     p.stock ?? 0,
      activo:    p.activo ?? p.active ?? true,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      taxRate:   p.taxRate ?? 0.16
    }));

    res.json({ data: mapped, page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) });
  } catch (err) {
    console.error('Error listando productos', err);
    res.status(500).json({ message: 'Error listando productos', error: err.message });
  }
});

export default router;