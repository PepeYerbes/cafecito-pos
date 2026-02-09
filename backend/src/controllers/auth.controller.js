// backend/src/controllers/auth.controller.js
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { signFor } from '../utils/jwt.js';

export async function bootstrapAdmin(req, res) {
  const { name = 'Admin', email, password = 'admin123' } = req.body || {};
  if (!email) return res.status(400).json({ message: 'email requerido' });

  const exists = await User.findOne({ role: 'ADMIN' });
  if (exists) return res.status(400).json({ message: 'Ya existe un ADMIN' });

  const hash = await bcrypt.hash(password, 10);
  const user = await User.create({ name, email, passwordHash: hash, role: 'ADMIN' });
  const token = signFor(user);
  res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
}

export async function login(req, res) {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ message: 'email y password requeridos' });

  const user = await User.findOne({ email });
  if (!user) return res.status(401).json({ message: 'Credenciales inválidas' });

  const ok = await bcrypt.compare(password, user.passwordHash || '');
  if (!ok) return res.status(401).json({ message: 'Credenciales inválidas' });

  const token = signFor(user);
  res.json({
    token,
    user: { id: user._id, name: user.name, email: user.email, role: user.role }
  });
}