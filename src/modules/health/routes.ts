import { Router } from 'express';
import { ok } from '../../core/http/response.js';

export const router = Router();

router.get('/', (_req, res) => {
  ok(res, { status: 'ok', uptime: process.uptime(), ts: new Date().toISOString() });
});


