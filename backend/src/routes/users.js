import { Router } from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { auth, adminOnly } from '../middlewares/auth.js';

const r = Router();

// Todas admin-only
r.use(auth, adminOnly);

// Listar (solo vendedores por defecto; admite ?all=true)
r.get('/', async (req, res) => {
  const all = String(req.query.all || 'false') === 'true';
  const q = all ? {} : { role: { $in: ['CASHIER'] } };
  const items = await User.find(q).sort({ createdAt: -1 }).lean();
  res.json(items.map(u => ({ id: u._id, name: u.name, email: u.email, role: u.role })));
});

// Crear vendedor
r.post('/', async (req, res) => {
  const { name, email, password, role = 'CASHIER' } = req.body || {};
  if (!name || !email || !password) return res.status(400).json({ message: 'name, email, password requeridos' });
  if (!['ADMIN', 'CASHIER'].includes(role)) return res.status(400).json({ message: 'role inválido' });

  const exists = await User.findOne({ email });
  if (exists) return res.status(400).json({ message: 'Email ya registrado' });

  const hash = await bcrypt.hash(password, 10);
  const u = await User.create({ name, email, role, passwordHash: hash });
  res.status(201).json({ id: u._id, name: u.name, email: u.email, role: u.role });
});

// Actualizar (nombre/rol y reset de password)
r.patch('/:id', async (req, res) => {
  const { name, role, password } = req.body || {};
  const update = {};
  if (name) update.name = name;
  if (role) {
    if (!['ADMIN', 'CASHIER'].includes(role)) return res.status(400).json({ message: 'role inválido' });
    update.role = role;
  }
  if (password) update.passwordHash = await bcrypt.hash(password, 10);

  const u = await User.findByIdAndUpdate(req.params.id, { $set: update }, { new: true });
  if (!u) return res.status(404).json({ message: 'Usuario no encontrado' });
  res.json({ id: u._id, name: u.name, email: u.email, role: u.role });
});

// Eliminar (baja lógica: opcional; aquí borrado simple)
r.delete('/:id', async (req, res) => {
  const u = await User.findByIdAndDelete(req.params.id);
  if (!u) return res.status(404).json({ message: 'Usuario no encontrado' });
  res.json({ ok: true, id: req.params.id });
});

export default r;