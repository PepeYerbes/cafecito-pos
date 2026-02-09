import { Router } from 'express';
import * as authCtrl from '../controllers/auth.controller.js';

const r = Router();

// Registro inicial (admin) opcional: solo si no hay admin
r.post('/bootstrap-admin', authCtrl.bootstrapAdmin);

// Login
r.post('/login', authCtrl.login);

export default r;