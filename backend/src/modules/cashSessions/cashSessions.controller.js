import * as service from './cashSessions.service.js';

export async function list(req, res, next) {
  try {
    const { status = 'CLOSED', page = 1, pageSize = 20, from, to } = req.query;
    const r = await service.list({
      status,
      page: +page,
      pageSize: +pageSize,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined
    });
    res.json(r);
  } catch (err) { next(err); }
}

export async function getById(req, res, next) {
  try {
    const s = await service.getById(req.params.id);
    if (!s) return res.status(404).json({ error: 'No encontrado' });
    res.json(s);
  } catch (err) { next(err); }
}

export async function downloadPdf(req, res, next) {
  try {
    const fileAbs = await service.ensurePdf(req.params.id); // genera si no existe
    if (!fileAbs) return res.status(404).json({ error: 'PDF no encontrado' });
    res.sendFile(fileAbs);
  } catch (err) { next(err); }
}

export async function reprint(req, res, next) {
  try {
    const fileAbs = await service.generatePdf(req.params.id);
    res.json({ ok: true, pdf: fileAbs });
  } catch (err) { next(err); }
}

export async function closeSession(req, res, next) {
  try {
    const { countedCash, notes, closedBy } = req.body || {};
    if (typeof countedCash !== 'number')
      return res.status(400).json({ error: 'countedCash (número) es requerido' });

    const s = await service.closeSession({
      sessionId: req.params.id,
      countedCash,
      notes,
      closedBy
    });
    res.json(s);
  } catch (err) { next(err); }
}