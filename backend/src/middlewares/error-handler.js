// backend/src/middleware/error-handler.js
export function errorHandler(err, _req, res, _next) {
  // Errores ya formateados
  if (err?.status && err?.payload) {
    return res.status(err.status).json(err.payload);
  }

  // Validación consolidada en 422
  if (err?.code === 'VALIDATION_ERROR') {
    return res.status(422).json({
      error: 'Validation failed',
      details: Array.isArray(err.details) ? err.details : [],
    });
  }

  // ObjectId inválido (Mongoose)
  if (err?.name === 'CastError' && err?.kind === 'ObjectId') {
    return res.status(422).json({
      error: 'Validation failed',
      details: [{ field: err.path, message: 'Invalid ObjectId' }],
    });
  }

  console.error('[ERROR]', err);
  return res.status(500).json({ error: 'Internal Server Error' });
}