import { Router } from 'express';
import * as cash from '../controllers/cash.controller.js';

const r = Router();

r.post('/cash/register/open', cash.open);
r.get('/cash/register/current', cash.current);
r.post('/cash/register/movement', cash.movement);
r.post('/cash/register/close', cash.close);
r.get('/cash/register/:id/report', cash.report);

export default r;