import { Router } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import Product from '../models/Product.js';
import { auth, adminOnly } from '../middlewares/auth.js';

const router = Router();

/** ---------- Helpers ---------- */
const toInt   = (v, d) => (Number.isNaN(parseInt(v, 10)) ? d : parseInt(v, 10));
const toFloat = (v, d) => (Number.isNaN(parseFloat(v)) ? d : parseFloat(v));

/** ---------- Multer (uploads de fotos) ---------- */
const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'products');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const name = `p_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`;
    cb(null, name);
  }
});
const upload = multer({ storage });

router.get('/', async (req, res) => {
  try {
    const { page, limit, q, categoria, minPrecio, maxPrecio, activo } = req.query;

    // Validación de query params (solo si vienen)
    const qErrors = [];
    if (page !== undefined) {
      const p = parseInt(String(page), 10);
      if (!Number.isInteger(p) || p < 1) qErrors.push({
        field: 'page', value: page,
        message: 'page must be a positive integer (greater than or equal to 1)'
      });
    }
    if (limit !== undefined) {
      const l = parseInt(String(limit), 10);
      if (!Number.isInteger(l) || l < 1 || l > 100) qErrors.push({
        field: 'limit', value: limit,
        message: 'limit must be a positive integer between 1 and 100'
      });
    }
    if (qErrors.length) return res.status(400).json({ error: 'Invalid query parameters', details: qErrors });

    const filtros = {};
    if (q) filtros.name = { $regex: String(q), $options: 'i' };
    if (categoria) filtros.categoria = categoria;
    if (activo !== undefined) filtros.active = String(activo) === 'true';
    if (minPrecio !== undefined || maxPrecio !== undefined) {
      filtros.price = {};
      if (minPrecio !== undefined) filtros.price.$gte = parseFloat(String(minPrecio)) || 0;
      if (maxPrecio !== undefined) filtros.price.$lte = parseFloat(String(maxPrecio)) || Number.MAX_SAFE_INTEGER;
    }

    const pageNum  = Math.max(1, page ? parseInt(String(page), 10) : 1);
    const limitNum = Math.min(100, Math.max(1, limit ? parseInt(String(limit), 10) : 12));
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
      taxRate:   p.taxRate ?? 0.16,
      imageUrl:  p.imageUrl || ''
    }));

    const payload = {
      data: mapped,
      page: pageNum, limit: limitNum, total,
      totalPages: Math.ceil(total / limitNum)
    };
    // Mensaje informativo si búsqueda no arrojó resultados
    if (q && String(q).trim() && total === 0) {
      return res.status(200).json({ ...payload, message: `No products found matching '${q}'` });
    }
    res.json(payload);
  } catch (err) {
    console.error('Error listando productos', err);
    res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
});

// GET by id => 404 consistente
router.get('/:id', async (req, res) => {
  const p = await Product.findById(req.params.id).lean();
  if (!p) return res.status(404).json({ error: 'Product not found', id: req.params.id });
  res.json({
    _id: String(p._id),
    nombre: p.nombre ?? p.name,
    precio: p.precio ?? p.price,
    categoria: p.categoria ?? 'Otro',
    codigo: p.codigo ?? p.sku,
    stock: p.stock ?? 0,
    activo: p.activo ?? p.active ?? true,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    taxRate: p.taxRate ?? 0.16,
    imageUrl: p.imageUrl || ''
  });
});


// POST (crear) [admin] — valida requeridos y reglas
router.post('/', auth, adminOnly, upload.single('image'), async (req, res) => {
  try {
    const body = req.body || {};
    const imageUrl = req.file ? `/public/uploads/products/${req.file.filename}` : (body.imageUrl || '');

    const errors = [];
    const name = body.nombre || body.name;
    const sku  = body.codigo || body.sku;
    const price = Number(body.precio ?? body.price);
    const stock = Number(body.stock ?? 0);
    const taxRate = Number(body.taxRate ?? 0.16);
    const categoria = body.categoria || 'Otro';
    const active = String(body.activo ?? body.active ?? 'true') === 'true';

    if (!name) errors.push({ field: 'name', message: 'name is required' });
    if (!sku)  errors.push({ field: 'sku',  message: 'sku is required' });
    if (!Number.isFinite(price)) errors.push({ field: 'price', message: 'price must be a number' });
    if (Number.isFinite(price) && price <= 0) errors.push({ field: 'price', message: 'price must be a number greater than 0' });
    if (!Number.isFinite(stock) || stock < 0) errors.push({ field: 'stock', message: 'stock must be a number ≥ 0' });
    if (!Number.isFinite(taxRate) || taxRate < 0 || taxRate > 1) errors.push({ field: 'taxRate', message: 'taxRate must be between 0 and 1' });
    if (errors.length) return res.status(422).json({ error: 'Validation failed', details: errors });

    const exists = await Product.findOne({ sku });
    if (exists) return res.status(400).json({ error: 'Business rule violation', details: [{ field: 'sku', message: 'SKU already exists' }] });

    const dto = { name, sku, price, stock, taxRate, categoria, active, imageUrl };
    const p = await Product.create(dto);
    res.status(201).json(p);
  } catch (err) {
    res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
});


// PUT (actualizar) [admin] — valida y evita SKU duplicado
router.put('/:id', auth, adminOnly, upload.single('image'), async (req, res) => {
  try {
    const id = String(req.params.id || '');
    const body = req.body || {};
    const update = {};
    const valErrors = [];

    if (!id) return res.status(404).json({ error: 'Product not found', id });

    if (req.file) update.imageUrl = `/public/uploads/products/${req.file.filename}`;
    if (body.nombre || body.name) update.name = body.nombre || body.name;
    if (body.codigo || body.sku) update.sku = body.codigo || body.sku;
    if (body.precio !== undefined || body.price !== undefined) {
      const v = Number(body.precio ?? body.price);
      if (!Number.isFinite(v) || v <= 0) valErrors.push({ field: 'price', message: 'price must be a number greater than 0' });
      else update.price = v;
    }
    if (body.taxRate !== undefined) {
      const v = Number(body.taxRate);
      if (!Number.isFinite(v) || v < 0 || v > 1) valErrors.push({ field: 'taxRate', message: 'taxRate must be between 0 and 1' });
      else update.taxRate = v;
    }
    if (body.stock !== undefined) {
      const v = Number(body.stock);
      if (!Number.isFinite(v) || v < 0) valErrors.push({ field: 'stock', message: 'stock must be a number ≥ 0' });
      else update.stock = v;
    }
    if (body.activo !== undefined || body.active !== undefined)
      update.active = String(body.activo ?? body.active) === 'true';
    if (body.categoria) update.categoria = body.categoria;

    if (valErrors.length) return res.status(422).json({ error: 'Validation failed', details: valErrors });

    if (update.sku) {
      const dup = await Product.findOne({ sku: update.sku, _id: { $ne: id } });
      if (dup) return res.status(400).json({ error: 'Business rule violation', details: [{ field: 'sku', message: 'SKU already exists' }] });
    }

    const p = await Product.findByIdAndUpdate(id, { $set: update }, { new: true });
    if (!p) return res.status(404).json({ error: 'Product not found', id });
    res.json(p);
  } catch (err) {
    res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
});

/** ---------- DELETE (baja) [admin] ---------- */
router.delete('/:id', auth, adminOnly, async (req, res) => {
  const p = await Product.findByIdAndDelete(req.params.id);
  if (!p) return res.status(404).json({ error: 'Product not found', id: req.params.id });
  res.json({ ok: true, id: req.params.id });
});

export default router;