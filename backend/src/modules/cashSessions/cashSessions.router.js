import { Router } from 'express';
import * as controller from './cashSessions.controller.js';

const router = Router();

// Historial de cierres (CLOSED) + filtros
router.get('/', controller.list);

// Detalle de sesión
router.get('/:id', controller.getById);

// Descargar/stream del PDF
router.get('/:id/pdf', controller.downloadPdf);

// Reimprimir PDF
router.post('/:id/reprint', controller.reprint);

// ✅ Cerrar una sesión (canónico)
router.post('/:id/close', controller.closeSession);

export default router;