import CashSession from '../models/CashSession.js';

export async function requireopenCash(req, res, next) {
  const session = await CashSession.findOne({ status: 'OPEN' });
  if (!session) return res.status(403).json({ message: 'No hay caja abierta' });
  req.session = session;
  next();
}