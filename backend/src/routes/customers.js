import { Router } from 'express';
import mongoose from 'mongoose';
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


// Email y teléfono válidos
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRegex = /^\+\d{8,15}$/; // comienza con + y luego 8–15 dígitos



// Crear (admin y cashier)
r.post('/', auth, async (req, res) => {
  try {
    const { name, phone, email, birthdate, notes } = req.body || {};
    const errors = [];

    if (!name) errors.push({ field: 'name', message: 'name is required' });
    if (name && (name.trim().length < 2 || name.trim().length > 100)) {
      errors.push({ field: 'name', message: 'name must be between 2 and 100 characters' });
    }

    // Requerimos al menos phone o email
    if (!phone && !email) {
      errors.push({ field: 'phoneOrEmail', message: 'Provide at least one: phone or email' });
    }

    if (email && !emailRegex.test(String(email))) {
      errors.push({ field: 'email', message: 'Must be a valid email (user@example.com)' });
    }
    if (phone && !phoneRegex.test(String(phone))) {
      errors.push({ field: 'phone', message: 'Must be a valid phone number (+56912345678)' });
    }
    if (errors.length) {
      return res.status(422).json({ error: 'Validation failed', details: errors });
    }

    // Unicidad: si ya existe, rechazamos (opción elegida)
    if (email) {
      const exists = await Customer.findOne({ email }).lean();
      if (exists) {
        return res.status(400).json({
          error: 'Customer already exists',
          details: [{ field: 'email', message: 'A customer with this email already exists', existingCustomerId: String(exists._id) }]
        });
      }
    }
    if (phone) {
      const exists = await Customer.findOne({ phone }).lean();
      if (exists) {
        return res.status(400).json({
          error: 'Customer already exists',
          details: [{ field: 'phone', message: 'A customer with this phone already exists', existingCustomerId: String(exists._id) }]
        });
      }
    }

    const c = await Customer.create({ name: name.trim(), phone, email, birthdate, notes });
    res.status(201).json(c);
  } catch (e) {
    res.status(500).json({ error: 'Internal Server Error', message: e.message });
  }
});

// Actualizar (admin y cashier)
r.patch('/:id', auth, async (req, res) => {
  try {
    const id = String(req.params.id || '');
    if (!mongoose.isValidObjectId(id)) return res.status(404).json({ error: 'Customer not found', id });

    const allow = ['name', 'phone', 'email', 'birthdate', 'notes', 'active'];
    const body = req.body || {};
    const update = {};
    const errors = [];

    for (const k of allow) if (k in body) update[k] = body[k];

    if (update.name) {
      const nm = String(update.name).trim();
      if (nm.length < 2 || nm.length > 100) {
        errors.push({ field: 'name', message: 'name must be between 2 and 100 characters' });
      } else {
        update.name = nm;
      }
    }
    if (update.email && !emailRegex.test(String(update.email))) {
      errors.push({ field: 'email', message: 'Must be a valid email (user@example.com)' });
    }
    if (update.phone && !phoneRegex.test(String(update.phone))) {
      errors.push({ field: 'phone', message: 'Must be a valid phone number (+56912345678)' });
    }
    if (errors.length) return res.status(422).json({ error: 'Validation failed', details: errors });

    // unicidad contra otros registros
    if (update.email) {
      const dupe = await Customer.findOne({ email: update.email, _id: { $ne: id } }).lean();
      if (dupe) {
        return res.status(400).json({
          error: 'Customer already exists',
          details: [{ field: 'email', message: 'A customer with this email already exists', existingCustomerId: String(dupe._id) }]
        });
      }
    }
    if (update.phone) {
      const dupe = await Customer.findOne({ phone: update.phone, _id: { $ne: id } }).lean();
      if (dupe) {
        return res.status(400).json({
          error: 'Customer already exists',
          details: [{ field: 'phone', message: 'A customer with this phone already exists', existingCustomerId: String(dupe._id) }]
        });
      }
    }

    const c = await Customer.findByIdAndUpdate(id, { $set: update }, { new: true });
    if (!c) return res.status(404).json({ error: 'Customer not found', id });
    res.json(c);
  } catch (e) {
    res.status(500).json({ error: 'Internal Server Error', message: e.message });
  }
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