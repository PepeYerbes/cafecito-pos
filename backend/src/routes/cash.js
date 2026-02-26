// backend/src/routes/cash.js
import { Router } from 'express';
import * as cash from '../controllers/cash.controller.js';
import { list as listSessions, closeSession as closeById } from '../modules/cashSessions/cashSessions.controller.js';
import CashSession from '../models/CashSession.js';
import { auth } from '../middlewares/auth.js';   // ← ajusta la ruta si tu middleware está en otro lugar

const r = Router();

// ⚠️ Rutas estáticas SIEMPRE antes de las dinámicas (:id)

r.post('/register/open',      auth, cash.open);
r.get('/register/current',    auth, cash.current);
r.post('/register/movement',  auth, cash.movement);
r.get('/register/history',    auth, listSessions);

// Alias de cierre
r.post('/register/close', auth, async (req, res, next) => {
  try {
    const current = await CashSession.findOne({ status: 'OPEN' }).lean();
    if (!current) return res.status(400).json({ message: 'No hay sesión abierta' });
    req.params.id = String(current._id);
    return closeById(req, res, next);
  } catch (err) {
    return next(err);
  }
});

// ✅ Reporte con auth — ruta dinámica al final
r.get('/register/:id/report', auth, cash.report);

export default r;