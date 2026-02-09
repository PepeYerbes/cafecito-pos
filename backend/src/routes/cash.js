import { Router } from 'express';
import * as cash from '../controllers/cash.controller.js';
import { list as listSessions, closeSession as closeById } from '../modules/cashSessions/cashSessions.controller.js';
import CashSession from '../models/CashSession.js';

const r = Router();

// ⚠️ Importante: este router se monta en /api/cash (no duplicar /cash aquí)
r.post('/register/open', cash.open);
r.get('/register/current', cash.current);
r.post('/register/movement', cash.movement);

// 🔁 Alias TEMPORAL de cierre para mantener compatibilidad con el FE actual.
//     Busca la sesión OPEN y llama al cierre canónico de /api/sessions/:id/close.
r.post('/register/close', async (req, res, next) => {
  try {
    const current = await CashSession.findOne({ status: 'OPEN' }).lean();
    if (!current) return res.status(400).json({ message: 'No hay sesión abierta' });

    // Inyectamos el id en params y delegamos al controlador canónico
    req.params.id = String(current._id);
    return closeById(req, res, next);
  } catch (err) {
    return next(err);
  }
});

// Reporte json/pdf (controlador original)
r.get('/register/:id/report', cash.report);

// Alias requerido por el frontend para el historial (usa módulo /sessions)
r.get('/register/history', listSessions);

export default r;