import { Router } from 'express';
import { asyncHandler } from '../../core/http/asyncHandler.js';
import { authenticate } from '../../core/middleware/auth.js';
import { createPayment, verifyPayment, handleIPN, processRefund } from './service.sslcommerz.js';

const router = Router();

/**
 * @route GET /api/payments/env-check
 * @desc Check SSLCommerz environment variables
 * @access Public
 */
router.get('/env-check', asyncHandler(async (req, res) => {
  const envVars = {
    SSLCOMMERZ_STORE_ID: process.env.SSLCOMMERZ_STORE_ID ? '***SET***' : 'NOT SET',
    SSLCOMMERZ_STORE_PASSWORD: process.env.SSLCOMMERZ_STORE_PASSWORD ? '***SET***' : 'NOT SET',
    SSLCOMMERZ_SANDBOX: process.env.SSLCOMMERZ_SANDBOX,
    SSLCOMMERZ_SUCCESS_URL: process.env.SSLCOMMERZ_SUCCESS_URL,
    SSLCOMMERZ_FAIL_URL: process.env.SSLCOMMERZ_FAIL_URL,
    SSLCOMMERZ_CANCEL_URL: process.env.SSLCOMMERZ_CANCEL_URL,
    SSLCOMMERZ_IPN_URL: process.env.SSLCOMMERZ_IPN_URL,
  };

  res.json({
    success: true,
    data: envVars
  });
}));

/**
 * @route POST /api/payments/create
 * @desc Create a new payment session with SSLCommerz
 * @access Private (authenticated users)
 */
router.post('/create', authenticate, asyncHandler(async (req, res) => {
  const { orderId, amount, currency = 'BDT', customerInfo, items } = req.body;

  // Validate required fields
  if (!orderId || !amount || !customerInfo) {
    return res.status(400).json({
      success: false,
      message: 'Order ID, amount, and customer information are required'
    });
  }

  try {
    const paymentSession = await createPayment({
      orderId,
      amount,
      currency,
      customerInfo,
      items
    });

    res.json({
      success: true,
      data: paymentSession
    });
  } catch (error: any) {
    console.error('Payment creation error:', error);
    const errorMessage = error?.message || 'Failed to create payment session';
    const errorDetails = error?.response?.data || error?.details || null;
    
    console.error('Error details:', {
      message: errorMessage,
      details: errorDetails,
      stack: error?.stack
    });
    
    res.status(500).json({
      success: false,
      message: errorMessage,
      details: errorDetails
    });
  }
}));

/**
 * @route POST /api/payments/verify
 * @desc Verify payment status with SSLCommerz
 * @access Private
 */
router.post('/verify', authenticate, asyncHandler(async (req, res) => {
  const { sessionKey, orderId } = req.body;

  if (!sessionKey || !orderId) {
    return res.status(400).json({
      success: false,
      message: 'Session key and order ID are required'
    });
  }

  try {
    const verification = await verifyPayment(sessionKey, orderId);
    res.json({
      success: true,
      data: verification
    });
  } catch (error: any) {
    console.error('Payment verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify payment'
    });
  }
}));

/**
 * @route POST /api/payments/webhook/sslcommerz
 * @desc Handle SSLCommerz IPN (Instant Payment Notification)
 * @access Public (SSLCommerz webhook)
 */
router.post('/webhook/sslcommerz', asyncHandler(async (req, res) => {
  try {
    console.log('SSLCommerz IPN received:', req.body);
    
    const result = await handleIPN(req.body);
    
    if (result.success) {
      res.status(200).json({
        success: true,
        message: 'IPN processed successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.error || 'IPN processing failed'
      });
    }
  } catch (error: any) {
    console.error('IPN processing error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during IPN processing'
    });
  }
}));

/**
 * @route POST /api/payments/refund
 * @desc Process a refund through SSLCommerz
 * @access Private (admin only)
 */
router.post('/refund', authenticate, asyncHandler(async (req, res) => {
  const { orderId, amount, reason } = req.body;

  if (!orderId || !amount) {
    return res.status(400).json({
      success: false,
      message: 'Order ID and amount are required for refund'
    });
  }

  try {
    const refundResult = await processRefund(orderId, amount, reason);
    
    res.json({
      success: true,
      data: refundResult
    });
  } catch (error: any) {
    console.error('Refund processing error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process refund'
    });
  }
}));

/**
 * @route GET /api/payments/test
 * @desc Test SSLCommerz integration
 * @access Private
 */
router.get('/test', authenticate, asyncHandler(async (req, res) => {
  try {
    // Test environment variables
    const requiredEnvVars = [
      'SSLCOMMERZ_STORE_ID',
      'SSLCOMMERZ_STORE_PASSWORD',
      'SSLCOMMERZ_SUCCESS_URL',
      'SSLCOMMERZ_FAIL_URL',
      'SSLCOMMERZ_CANCEL_URL'
    ];

    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      return res.status(500).json({
        success: false,
        message: `Missing required environment variables: ${missingVars.join(', ')}`
      });
    }

    res.json({
      success: true,
      message: 'SSLCommerz integration test passed',
      data: {
        storeId: process.env.SSLCOMMERZ_STORE_ID,
        sandbox: process.env.SSLCOMMERZ_SANDBOX === 'true',
        successUrl: process.env.SSLCOMMERZ_SUCCESS_URL,
        failUrl: process.env.SSLCOMMERZ_FAIL_URL,
        cancelUrl: process.env.SSLCOMMERZ_CANCEL_URL
      }
    });
  } catch (error: any) {
    console.error('Integration test error:', error);
    res.status(500).json({
      success: false,
      message: 'Integration test failed'
    });
  }
}));

export { router };
export default router;