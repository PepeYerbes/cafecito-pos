import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import './config/db.js';
import cashRoutes from './routes/cash.js';
import salesRoutes from './routes/sales.js';
import productsRoutes from './routes/products.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(morgan('dev'));

// Health
app.get('/api/health', (_, res) => res.json({ ok: true, time: new Date().toISOString() }));

// Rutas
app.use('/api/cash', cashRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api', cashRoutes);
app.use('/api/productos', productsRoutes);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Backend POS escuchando en :${PORT}`));