import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';

import './config/db.js';
import cashRoutes from './routes/cash.js';
import salesRoutes from './routes/sales.js';
import productsRoutes from './routes/products.js';

// ⬇️ NUEVO: router de sesiones/cierres
import sessionsRouter from './modules/cashSessions/cashSessions.router.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(morgan('dev'));

// ⬇️ NUEVO: servir /public para logo y PDFs
app.use('/public', express.static(path.resolve(process.cwd(), 'public')));

// Health
app.get('/api/health', (_, res) => res.json({ ok: true, time: new Date().toISOString() }));

// Rutas existentes
app.use('/api/cash', cashRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/productos', productsRoutes);

// ⛔️ Antes tenías: app.use('/api', cashRoutes);
//     Eso duplica endpoints y puede causar conflictos.
//     Lo ELIMINAMOS. Si necesitas alias específicos, los montamos explícitos.

// ⬇️ NUEVO: sesiones/cierres (historial, detalle, cerrar, pdf, reimprimir)
app.use('/api/sessions', sessionsRouter);

// Manejo de errores básico
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Error interno' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Backend POS escuchando en :${PORT}`));