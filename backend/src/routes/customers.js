import { Router } from 'express';
import Customer from '../models/Customer.js';
import { auth, adminOnly } from '../middlewares/auth.js';

const r = Router();

// List (admin y cashier)
r.get('/', auth, async (req, res) => {
  const { q, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (q) {
    filter.$or = [
      { name: { $regex: String(q), $options: 'i' } },
      { phone: { $regex: String(q), $options: 'i' } },
      { email: { $regex: String(q), $options: 'i' } }
    ];
  }
  const p = Math.max(1, parseInt(page, 10) || 1);
  const l = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (p - 1) * l;

  const [items, total] = await Promise.all([
    Customer.find(filter).sort({ createdAt: -1 }).skip(skip).limit(l).lean(),
    Customer.countDocuments(filter)
  ]);
  res.json({ data: items, page: p, limit: l, total, totalPages: Math.ceil(total / l) });
});

// Crear (admin y cashier)
r.post('/', auth, async (req, res) => {
  const { name, phone, email, birthdate, notes } = req.body || {};
  if (!name) return res.status(400).json({ message: 'name requerido' });
  const c = await Customer.create({ name, phone, email, birthdate, notes });
  res.status(201).json(c);
});

// Actualizar (admin y cashier)
r.patch('/:id', auth, async (req, res) => {
  const allow = ['name', 'phone', 'email', 'birthdate', 'notes', 'active'];
  const update = {};
  for (const k of allow) if (k in req.body) update[k] = req.body[k];
  const c = await Customer.findByIdAndUpdate(req.params.id, { $set: update }, { new: true });
  if (!c) return res.status(404).json({ message: 'Cliente no encontrado' });
  res.json(c);
});

// Eliminar (baja) [admin]
r.delete('/:id', auth, adminOnly, async (req, res) => {
  const c = await Customer.findByIdAndDelete(req.params.id);
  if (!c) return res.status(404).json({ message: 'Cliente no encontrado' });
  res.json({ ok: true, id: req.params.id });
});

// Lealtad: canjear puntos (admin y cashier)
r.post('/:id/redeem', auth, async (req, res) => {
  const { points } = req.body || {};
  const c = await Customer.findById(req.params.id);
  if (!c) return res.status(404).json({ message: 'Cliente no encontrado' });
  const p = Math.max(0, parseInt(points, 10) || 0);
  if (p <= 0) return res.status(400).json({ message: 'points inválidos' });
  if (c.points < p) return res.status(400).json({ message: 'Puntos insuficientes' });
  c.points -= p;
  await c.save();
  res.json({ ok: true, customer: c });
});

export default r;