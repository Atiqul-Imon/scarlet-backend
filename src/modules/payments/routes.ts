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
    // Comprehensive logging for debugging
    console.log('=== SSLCommerz IPN Received ===');
    console.log('Timestamp:', new Date().toISOString());
    console.log('Headers:', JSON.stringify(req.headers, null, 2));
    console.log('Body (raw):', req.body);
    console.log('Body type:', typeof req.body);
    console.log('Body keys:', Object.keys(req.body || {}));
    console.log('Content-Type:', req.headers['content-type']);
    console.log('================================');
    
    // SSLCommerz may send data as form-encoded or JSON
    // Ensure we capture all data
    const ipnData = req.body || {};
    
    // Log all IPN data fields
    console.log('IPN Data Fields:');
    Object.keys(ipnData).forEach(key => {
      console.log(`  ${key}: ${ipnData[key]}`);
    });
    
    const result = await handleIPN(ipnData);
    
    if (result.success) {
      console.log('✅ IPN processed successfully');
      res.status(200).json({
        success: true,
        message: 'IPN processed successfully'
      });
    } else {
      console.error('❌ IPN processing failed:', result.error);
      res.status(400).json({
        success: false,
        message: result.error || 'IPN processing failed'
      });
    }
  } catch (error: any) {
    console.error('❌ IPN processing error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Internal server error during IPN processing',
      error: error.message
    });
  }
}));

/**
 * @route GET /api/payments/sslcommerz/success
 * @desc SSLCommerz success callback - verify payment and update order
 * @access Public (SSLCommerz callback)
 */
router.get('/sslcommerz/success', asyncHandler(async (req, res) => {
  try {
    console.log('=== SSLCommerz Success Callback ===');
    console.log('Query params:', req.query);
    
    const { tran_id, status, val_id } = req.query;
    
    if (!tran_id) {
      console.error('Missing tran_id in success callback');
      return res.status(400).send('Missing transaction ID');
    }
    
    // Import order repository and payment service
    const orderRepo = await import('../orders/repository.js');
    const { verifyPayment } = await import('./service.sslcommerz.js');
    const gateway = (await import('./gateways/sslcommerz.js')).getSSLCommerzGateway();
    
    // Find order by order number (tran_id is the order number)
    const order = await orderRepo.getOrderByOrderNumber(tran_id as string);
    
    if (!order) {
      console.error(`Order not found for transaction: ${tran_id}`);
      return res.status(404).send('Order not found');
    }
    
    // Query SSLCommerz to verify payment status
    console.log(`Verifying payment for order: ${order.orderNumber}`);
    const verification = await gateway.queryTransaction(order.orderNumber);
    
    if (verification.success && verification.status === 'VALID') {
      // Payment is valid - update order
      console.log(`✅ Payment verified for order: ${order.orderNumber}`);
      
      await orderRepo.updateOrderStatus(order._id!.toString(), 'confirmed');
      await orderRepo.updateOrderPaymentStatus(order._id!.toString(), 'completed');
      
      // Redirect to frontend success page
      const frontendUrl = process.env.FRONTEND_URL || 'https://www.scarletunlimited.net';
      return res.redirect(`${frontendUrl}/payment/success?orderId=${order._id}&orderNumber=${order.orderNumber}`);
    } else {
      console.warn(`⚠️ Payment not valid for order: ${order.orderNumber}, status: ${verification.status}`);
      // Still redirect but with warning
      const frontendUrl = process.env.FRONTEND_URL || 'https://www.scarletunlimited.net';
      return res.redirect(`${frontendUrl}/payment/success?orderId=${order._id}&orderNumber=${order.orderNumber}&warning=true`);
    }
  } catch (error: any) {
    console.error('❌ Error in success callback:', error);
    const frontendUrl = process.env.FRONTEND_URL || 'https://www.scarletunlimited.net';
    return res.redirect(`${frontendUrl}/payment/failed?error=verification_failed`);
  }
}));

/**
 * @route GET /api/payments/sslcommerz/failed
 * @desc SSLCommerz failed callback - update order status
 * @access Public (SSLCommerz callback)
 */
router.get('/sslcommerz/failed', asyncHandler(async (req, res) => {
  try {
    console.log('=== SSLCommerz Failed Callback ===');
    console.log('Query params:', req.query);
    
    const { tran_id } = req.query;
    
    if (tran_id) {
      const orderRepo = await import('../orders/repository.js');
      const catalogRepo = await import('../catalog/repository.js');
      
      const order = await orderRepo.getOrderByOrderNumber(tran_id as string);
      
      if (order) {
        await orderRepo.updateOrderStatus(order._id!.toString(), 'cancelled');
        await orderRepo.updateOrderPaymentStatus(order._id!.toString(), 'failed');
        
        // Restore stock
        for (const item of order.items) {
          try {
            await catalogRepo.incrementStock(item.productId, item.quantity);
            console.log(`✅ Restored stock for product ${item.productId}`);
          } catch (error) {
            console.error(`❌ Failed to restore stock:`, error);
          }
        }
      }
    }
    
    const frontendUrl = process.env.FRONTEND_URL || 'https://www.scarletunlimited.net';
    return res.redirect(`${frontendUrl}/payment/failed?orderId=${tran_id || ''}`);
  } catch (error: any) {
    console.error('❌ Error in failed callback:', error);
    const frontendUrl = process.env.FRONTEND_URL || 'https://www.scarletunlimited.net';
    return res.redirect(`${frontendUrl}/payment/failed`);
  }
}));

/**
 * @route GET /api/payments/sslcommerz/cancelled
 * @desc SSLCommerz cancelled callback - update order status
 * @access Public (SSLCommerz callback)
 */
router.get('/sslcommerz/cancelled', asyncHandler(async (req, res) => {
  try {
    console.log('=== SSLCommerz Cancelled Callback ===');
    console.log('Query params:', req.query);
    
    const { tran_id } = req.query;
    
    if (tran_id) {
      const orderRepo = await import('../orders/repository.js');
      const catalogRepo = await import('../catalog/repository.js');
      
      const order = await orderRepo.getOrderByOrderNumber(tran_id as string);
      
      if (order) {
        await orderRepo.updateOrderStatus(order._id!.toString(), 'cancelled');
        await orderRepo.updateOrderPaymentStatus(order._id!.toString(), 'failed');
        
        // Restore stock
        for (const item of order.items) {
          try {
            await catalogRepo.incrementStock(item.productId, item.quantity);
            console.log(`✅ Restored stock for product ${item.productId}`);
          } catch (error) {
            console.error(`❌ Failed to restore stock:`, error);
          }
        }
      }
    }
    
    const frontendUrl = process.env.FRONTEND_URL || 'https://www.scarletunlimited.net';
    return res.redirect(`${frontendUrl}/payment/cancelled?orderId=${tran_id || ''}`);
  } catch (error: any) {
    console.error('❌ Error in cancelled callback:', error);
    const frontendUrl = process.env.FRONTEND_URL || 'https://www.scarletunlimited.net';
    return res.redirect(`${frontendUrl}/payment/cancelled`);
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
 * @route POST /api/payments/verify-manual
 * @desc Manually verify payment status for an order (fallback if IPN fails)
 * @access Public (can be called from frontend)
 */
router.post('/verify-manual', asyncHandler(async (req, res) => {
  try {
    const { orderId, orderNumber } = req.body;
    
    if (!orderId && !orderNumber) {
      return res.status(400).json({
        success: false,
        message: 'Order ID or order number is required'
      });
    }
    
    const orderRepo = await import('../orders/repository.js');
    const gateway = (await import('./gateways/sslcommerz.js')).getSSLCommerzGateway();
    
    // Find order
    let order;
    if (orderNumber) {
      order = await orderRepo.getOrderByOrderNumber(orderNumber);
    } else if (orderId) {
      const { ObjectId } = await import('mongodb');
      const { getDb } = await import('../../core/db/mongoClient.js');
      const db = await getDb();
      order = await db.collection('orders').findOne({ _id: new ObjectId(orderId) });
    }
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    const orderNum = (order as any).orderNumber || orderNumber;
    console.log(`🔍 Manually verifying payment for order: ${orderNum}`);
    
    // Query SSLCommerz
    const verification = await gateway.queryTransaction(orderNum);
    
    if (verification.success && verification.status === 'VALID') {
      // Update order
      await orderRepo.updateOrderStatus((order as any)._id.toString(), 'confirmed');
      await orderRepo.updateOrderPaymentStatus((order as any)._id.toString(), 'completed');
      
      return res.json({
        success: true,
        message: 'Payment verified and order updated',
        status: 'completed'
      });
    } else {
      return res.json({
        success: false,
        message: 'Payment not verified',
        status: verification.status || 'unknown'
      });
    }
  } catch (error: any) {
    console.error('Manual verification error:', error);
    return res.status(500).json({
      success: false,
      message: 'Verification failed',
      error: error.message
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