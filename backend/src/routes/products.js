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

/** ---------- GET (listado con filtros) ---------- */
router.get('/', async (req, res) => {
  try {
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
      taxRate:   p.taxRate ?? 0.16,
      imageUrl:  p.imageUrl || ''
    }));

    res.json({ data: mapped, page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) });
  } catch (err) {
    console.error('Error listando productos', err);
    res.status(500).json({ message: 'Error listando productos', error: err.message });
  }
});

/** ---------- GET by id ---------- */
router.get('/:id', async (req, res) => {
  const p = await Product.findById(req.params.id).lean();
  if (!p) return res.status(404).json({ message: 'Producto no encontrado' });
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

/** ---------- POST (crear) [admin] ----------
 * Admite:
 *  - multipart/form-data con campo `image` (archivo) + campos JSON
 *  - JSON puro (con imageUrl)
 */
router.post('/', auth, adminOnly, upload.single('image'), async (req, res) => {
  try {
    const body = req.body || {};
    const imageUrl = req.file ? `/public/uploads/products/${req.file.filename}` : (body.imageUrl || '');
    const dto = {
      name: body.nombre || body.name,
      sku: body.codigo || body.sku,
      price: Number(body.precio ?? body.price),
      taxRate: Number(body.taxRate ?? 0.16),
      stock: Number(body.stock ?? 0),
      active: String(body.activo ?? body.active ?? 'true') === 'true',
      categoria: body.categoria || 'Otro',
      imageUrl
    };
    if (!dto.name || !dto.sku || !Number.isFinite(dto.price)) {
      return res.status(400).json({ message: 'Campos inválidos (nombre, codigo, precio)' });
    }
    const exists = await Product.findOne({ sku: dto.sku });
    if (exists) return res.status(400).json({ message: 'SKU ya existente' });
    const p = await Product.create(dto);
    res.status(201).json(p);
  } catch (err) {
    res.status(400).json({ message: 'Error creando producto', error: err.message });
  }
});

/** ---------- PUT (actualizar) [admin] ---------- */
router.put('/:id', auth, adminOnly, upload.single('image'), async (req, res) => {
  try {
    const body = req.body || {};
    const update = {};
    if (req.file) update.imageUrl = `/public/uploads/products/${req.file.filename}`;
    if (body.nombre || body.name) update.name = body.nombre || body.name;
    if (body.codigo || body.sku) update.sku = body.codigo || body.sku;
    if (body.precio ?? body.price) update.price = Number(body.precio ?? body.price);
    if (body.taxRate !== undefined) update.taxRate = Number(body.taxRate);
    if (body.stock !== undefined) update.stock = Number(body.stock);
    if (body.activo !== undefined || body.active !== undefined)
      update.active = String(body.activo ?? body.active) === 'true';
    if (body.categoria) update.categoria = body.categoria;

    const p = await Product.findByIdAndUpdate(req.params.id, { $set: update }, { new: true });
    if (!p) return res.status(404).json({ message: 'Producto no encontrado' });
    res.json(p);
  } catch (err) {
    res.status(400).json({ message: 'Error actualizando producto', error: err.message });
  }
});

/** ---------- DELETE (baja) [admin] ---------- */
router.delete('/:id', auth, adminOnly, async (req, res) => {
  const p = await Product.findByIdAndDelete(req.params.id);
  if (!p) return res.status(404).json({ message: 'Producto no encontrado' });
  res.json({ ok: true, id: req.params.id });
});

export default router;