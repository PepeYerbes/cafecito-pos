// Para demo, inyecta req.user fijo. Sustituye por tu auth real.
export function auth(req, res, next) {
  // En producción: leer Authorization: Bearer <token> y verificar JWT.
  // Aquí inyectamos un cajero ficticio:
  req.user = { id: 'user-demo-1', name: 'Cajero Demo', role: 'CASHIER' };
  next();
}