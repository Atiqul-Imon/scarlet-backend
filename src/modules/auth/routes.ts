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

// Password reset with OTP flow
import * as passwordResetController from './password-reset.controller.js';
router.post('/password-reset/send-otp', rateLimits.passwordReset, passwordResetController.sendPasswordResetOTP);
router.post('/password-reset/verify-otp', rateLimits.passwordReset, passwordResetController.verifyPasswordResetOTP);
router.post('/password-reset/set-password', rateLimits.passwordReset, passwordResetController.setNewPassword);

// Protected routes (authentication required)
router.post('/logout', requireAuth, controller.logout);
router.post('/change-password', requireAuth, rateLimits.auth, controller.changePassword);
router.get('/profile', requireAuth, controller.getProfile);

// OTP routes for phone verification
router.post('/send-phone-otp', requireAuth, rateLimits.auth, controller.sendPhoneOtp);
router.post('/verify-phone-otp', requireAuth, rateLimits.auth, controller.verifyPhoneOtp);

// OTP-based passwordless login
router.post('/request-login-otp', rateLimits.login, controller.requestLoginOTP);
router.post('/verify-login-otp', rateLimits.login, controller.verifyLoginOTP);

// Session management routes
import * as sessionController from './sessions/controller.js';
router.get('/sessions', requireAuth, sessionController.getSessions);
router.delete('/sessions/:id', requireAuth, sessionController.terminateSession);
router.delete('/sessions', requireAuth, sessionController.terminateAllSessions);


