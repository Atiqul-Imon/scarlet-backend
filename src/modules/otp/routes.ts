import { Router } from 'express';
import * as controller from './controller.js';

export const router = Router();

// Generate and send OTP
router.post('/generate', controller.generateOTP);

// Verify OTP
router.post('/verify', controller.verifyOTP);

// Check OTP status
router.get('/status', controller.checkOTPStatus);

// Cleanup expired OTPs (admin endpoint)
router.post('/cleanup', controller.cleanupExpiredOTPs);
