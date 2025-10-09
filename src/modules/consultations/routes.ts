import { Router } from 'express';
import { requireAuth, requireAdmin } from '../../core/middleware/auth.js';
import * as controller from './controller.js';

export const router = Router();

// Public route - Submit consultation (no auth required)
router.post('/submit', controller.submitConsultation);

// Admin routes
router.get('/', requireAdmin, controller.getConsultations);
router.get('/stats', requireAdmin, controller.getConsultationStats);
router.get('/:id', requireAdmin, controller.getConsultationById);
router.put('/:id/status', requireAdmin, controller.updateConsultationStatus);
router.put('/:id', requireAdmin, controller.updateConsultation);
router.delete('/:id', requireAdmin, controller.deleteConsultation);

