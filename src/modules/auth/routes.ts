import { Router } from 'express';
import { requireAuth } from '../../core/middleware/auth.js';
import * as controller from './controller.js';

export const router = Router();

// Public routes (no authentication required)
router.post('/register', controller.register);
router.post('/login', controller.login);
router.post('/refresh', controller.refreshToken);
router.post('/forgot-password', controller.forgotPassword);
router.post('/reset-password', controller.resetPassword);

// Protected routes (authentication required)
router.post('/logout', requireAuth, controller.logout);
router.post('/change-password', requireAuth, controller.changePassword);
router.get('/profile', requireAuth, controller.getProfile);


