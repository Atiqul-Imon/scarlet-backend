import { Router } from 'express';
import { requireAuth } from '../../core/middleware/auth.js';
import { rateLimits } from '../../core/middleware/rateLimiting.js';
import * as controller from './controller.js';

export const router = Router();

// Public routes (no authentication required)
router.post('/register', rateLimits.register, controller.register);
router.post('/login', rateLimits.login, controller.login);
router.post('/refresh', rateLimits.auth, controller.refreshToken);
router.post('/forgot-password', rateLimits.passwordReset, controller.forgotPassword);
router.post('/reset-password', rateLimits.passwordReset, controller.resetPassword);

// Protected routes (authentication required)
router.post('/logout', requireAuth, controller.logout);
router.post('/change-password', requireAuth, rateLimits.auth, controller.changePassword);
router.get('/profile', requireAuth, controller.getProfile);


