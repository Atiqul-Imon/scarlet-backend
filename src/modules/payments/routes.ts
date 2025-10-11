import { Router } from 'express';
import { asyncHandler } from '../../core/http/asyncHandler';
import { authenticate } from '../../core/middleware/auth';
import { createPayment, verifyPayment, handleIPN, processRefund } from './service.sslcommerz';

const router = Router();

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
    res.status(500).json({
      success: false,
      message: 'Failed to create payment session'
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
    const ipnData = req.body;
    
    // Log the IPN data for debugging
    console.log('SSLCommerz IPN received:', ipnData);
    
    // Process the IPN
    const result = await handleIPN(ipnData);
    
    if (result.success) {
      res.status(200).send('SUCCESS');
    } else {
      console.error('IPN processing failed:', result.error);
      res.status(400).send('FAILED');
    }
  } catch (error: any) {
    console.error('IPN webhook error:', error);
    res.status(500).send('ERROR');
  }
}));

/**
 * @route POST /api/payments/refund
 * @desc Process a refund through SSLCommerz
 * @access Private (admin only)
 */
router.post('/refund', authenticate, asyncHandler(async (req, res) => {
  const { transactionId, amount, reason } = req.body;

  if (!transactionId || !amount) {
    return res.status(400).json({
      success: false,
      message: 'Transaction ID and amount are required'
    });
  }

  try {
    const refund = await processRefund(transactionId, amount, reason);
    res.json({
      success: true,
      data: refund
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
 * @access Private (admin only)
 */
router.get('/test', authenticate, asyncHandler(async (req, res) => {
  try {
    // Test payment creation with dummy data
    const testPayment = await createPayment({
      orderId: `TEST_${Date.now()}`,
      amount: '100.00',
      currency: 'BDT',
      customerInfo: {
        name: 'Test Customer',
        email: 'test@example.com',
        phone: '01711111111',
        address: 'Test Address',
        city: 'Dhaka',
        country: 'Bangladesh',
        postcode: '1000'
      },
      items: [{
        name: 'Test Product',
        category: 'Beauty',
        quantity: 1,
        price: '100.00'
      }]
    });

    res.json({
      success: true,
      message: 'SSLCommerz integration test successful',
      data: testPayment
    });
  } catch (error: any) {
    console.error('SSLCommerz test error:', error);
    res.status(500).json({
      success: false,
      message: 'SSLCommerz integration test failed',
      error: error.message
    });
  }
}));

export { router };
export default router;