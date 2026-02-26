import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import './config/db.js';
import cashRoutes from './routes/cash.js';
import salesRoutes from './routes/sales.js';
import productsRoutes from './routes/products.js';
import sessionsRouter from './modules/cashSessions/cashSessions.router.js';
import authRoutes from './routes/auth.js';
import usersRoutes from './routes/users.js';
import customersRoutes from './routes/customers.js';
import { errorHandler } from './middlewares/error-handler.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(morgan('dev'));
app.use('/public', express.static(path.resolve(process.cwd(), 'public')));
app.get('/api/health', (_req, res) => res.json({ ok: true, time: new Date().toISOString() }));
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);         // admin-only
app.use('/api/customers', customersRoutes); // admin + cashier (según método)
app.use('/api/cash', cashRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/products', productsRoutes);

app.use(errorHandler);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Backend POS escuchando en :${PORT}`));