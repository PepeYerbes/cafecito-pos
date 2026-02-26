// backend/src/server.js
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import helmet from 'helmet';

import './config/db.js';
import ordersRoutes from './routes/orders.js';
import cashRoutes from './routes/cash.js';
import salesRoutes from './routes/sales.js';
import productsRoutes from './routes/products.js';
import sessionsRouter from './modules/cashSessions/cashSessions.router.js'; // (si lo montas, ver más abajo)
import authRoutes from './routes/auth.js';
import usersRoutes from './routes/users.js';
import customersRoutes from './routes/customers.js';

import { errorHandler } from './middlewares/error-handler.js';

dotenv.config();

const app = express();

// ✅ Render corre detrás de proxy; habilita si luego usas cookies/headers de IP
app.set('trust proxy', 1);

// 🛡️ Cabeceras de seguridad razonables
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // permite servir /public a otros orígenes
  })
);

// 🔗 CORS: permite frontend de Render + localhost en dev
const allowedOriginsEnv = process.env.ALLOWED_ORIGINS?.split(',').map(o => o.trim()).filter(Boolean) ?? [];
const defaultAllowed = [
  'https://cafecito-pos-frontend-66o7.onrender.com', // tu frontend en Render
  'http://localhost:4200',                            // dev local Angular
];
const allowedOrigins = [...new Set([...defaultAllowed, ...allowedOriginsEnv])];

app.use(
  cors({
    origin(origin, cb) {
      // Permitir requests del mismo servidor (como healthchecks) sin 'Origin'
      if (!origin) return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error(`CORS bloqueado para origen: ${origin}`));
    },
    credentials: true,
  })
);

// 📦 Parsers
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

// 📝 Logs
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// 🖼️ Archivos estáticos (uploads, etc.)
app.use('/public', express.static(path.resolve(process.cwd(), 'public')));

// 💓 Health checks
app.get('/', (_req, res) => res.json({ ok: true, name: 'cafecito-pos-backend', time: new Date().toISOString() }));
app.get('/api/health', (_req, res) => res.json({ ok: true, time: new Date().toISOString() }));

// 🔐 Rutas API
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);         // admin-only
app.use('/api/customers', customersRoutes); // admin + cashier (según método)
app.use('/api/cash', cashRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/orders', ordersRoutes);

// Si ya quieres exponer el módulo de sessions:
// app.use('/api/cash-sessions', sessionsRouter);

// 🧯 Manejador centralizado de errores
app.use(errorHandler);

// 🚀 Start
const PORT = process.env.PORT || 3001;
const server = app.listen(PORT, () => {
  console.log(`Backend POS escuchando en :${PORT}`);
});

// 🔌 Apagado limpio (útil en despliegues)
const shutdown = (signal) => {
  console.log(`\nRecibido ${signal}. Cerrando servidor...`);
  server.close(() => {
    console.log('Servidor cerrado.');
    process.exit(0);
  });
  // Forzar cierre si algo se cuelga
  setTimeout(() => process.exit(1), 10000).unref();
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));