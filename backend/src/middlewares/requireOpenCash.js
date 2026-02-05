import openCash from '../models/CashSession.js';

export async function requireopenCash(req, res, next) {
  const userId = req.user.id;
  const session = await openCash.findOne({ userId, status: 'OPEN' });
  if (!session) return res.status(403).json({ message: 'No hay caja abierta' });
  req.session = session;
  next();
}
``