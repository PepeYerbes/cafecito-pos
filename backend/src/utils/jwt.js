import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

const SECRET = process.env.JWT_SECRET || 'dev-secret';
const EXPIRES = process.env.JWT_EXPIRES || '8h';

export function signFor(user) {
  const payload = {
    sub: String(user._id),
    role: user.role,
    name: user.name,
    email: user.email
  };
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRES });
}