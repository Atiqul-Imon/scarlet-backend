import type { Request, Response } from 'express';
import { ok, fail } from '../../core/http/response.js';
import { asyncHandler } from '../../core/http/asyncHandler.js';
import { SSLCommerzService } from '../services/sslcommerzService.js';
import { getDb } from '../../core/db/mongoClient.js';
import { ObjectId } from 'mongodb';

const sslCommerzService = new SSLCommerzService();

// Create payment session
export const createPaymentSession = asyncHandler(async (req: Request, res: Response) => {
  const { orderId } = req.body;

  if (!orderId) {
    return fail(res, { 
      message: 'Order ID is required',
      code: 'ORDER_ID_REQUIRED' 
    }, 400);
  }

  if (!sslCommerzService.isConfigured()) {
    return fail(res, { 
      message: 'SSL Commerz is not configured',
      code: 'SSL_COMMERZ_NOT_CONFIGURED' 
    }, 500);
  }

  try {
    // Get order from database
    const db = await getDb();
    const order = await db.collection('orders').findOne({ _id: new ObjectId(orderId) });

    if (!order) {
      return fail(res, { 
        message: 'Order not found',
        code: 'ORDER_NOT_FOUND' 
      }, 404);
    }

    // Create payment session
    const paymentSession = await sslCommerzService.createPaymentSession(order);

    ok(res, {
      sessionKey: paymentSession.sessionKey,
      gatewayUrl: paymentSession.gatewayUrl,
      paymentMethods: paymentSession.paymentMethods,
      orderId: order._id,
      orderNumber: order.orderNumber,
      amount: order.total,
      currency: order.currency
    });
  } catch (error: any) {
    console.error('SSL Commerz payment session creation failed:', error);
    return fail(res, { 
      message: error.message || 'Failed to create payment session',
      code: 'PAYMENT_SESSION_CREATION_FAILED' 
    }, 500);
  }
});

// Payment success callback
export const paymentSuccess = asyncHandler(async (req: Request, res: Response) => {
  const { val_id, amount, currency, tran_id, status, bank_tran_id, card_type, store_amount } = req.query;

  if (!val_id || !amount || !currency || !tran_id) {
    return fail(res, { 
      message: 'Invalid payment callback data',
      code: 'INVALID_CALLBACK_DATA' 
    }, 400);
  }

  try {
    const result = await sslCommerzService.processPaymentCallback({
      val_id,
      amount: parseFloat(amount as string),
      currency,
      tran_id,
      status,
      bank_tran_id,
      card_type,
      store_amount
    });

    ok(res, {
      orderId: result.orderId,
      status: result.status,
      transactionId: result.transactionId,
      amount: result.amount,
      currency: result.currency,
      message: 'Payment processed successfully'
    });
  } catch (error: any) {
    console.error('SSL Commerz payment success processing failed:', error);
    return fail(res, { 
      message: error.message || 'Failed to process payment',
      code: 'PAYMENT_PROCESSING_FAILED' 
    }, 500);
  }
});

// Payment failure callback
export const paymentFailure = asyncHandler(async (req: Request, res: Response) => {
  const { val_id, amount, currency, tran_id, status, failedreason } = req.query;

  console.log('SSL Commerz payment failure:', { val_id, tran_id, status, failedreason });

  try {
    // Update order status to cancelled
    if (tran_id) {
      const db = await getDb();
      await db.collection('orders').updateOne(
        { orderNumber: tran_id },
        {
          $set: {
            status: 'cancelled',
            paymentInfo: {
              method: 'sslcommerz',
              status: 'failed',
              transactionId: val_id || '',
              paymentDate: new Date().toISOString(),
              failureReason: failedreason || 'Payment failed'
            },
            updatedAt: new Date().toISOString()
          }
        }
      );
    }

    ok(res, {
      message: 'Payment failure processed',
      orderNumber: tran_id,
      status: 'cancelled',
      reason: failedreason
    });
  } catch (error: any) {
    console.error('SSL Commerz payment failure processing failed:', error);
    return fail(res, { 
      message: error.message || 'Failed to process payment failure',
      code: 'PAYMENT_FAILURE_PROCESSING_FAILED' 
    }, 500);
  }
});

// Payment cancellation callback
export const paymentCancellation = asyncHandler(async (req: Request, res: Response) => {
  const { val_id, amount, currency, tran_id, status } = req.query;

  console.log('SSL Commerz payment cancellation:', { val_id, tran_id, status });

  try {
    // Update order status to cancelled
    if (tran_id) {
      const db = await getDb();
      await db.collection('orders').updateOne(
        { orderNumber: tran_id },
        {
          $set: {
            status: 'cancelled',
            paymentInfo: {
              method: 'sslcommerz',
              status: 'cancelled',
              transactionId: val_id || '',
              paymentDate: new Date().toISOString(),
              failureReason: 'Payment cancelled by user'
            },
            updatedAt: new Date().toISOString()
          }
        }
      );
    }

    ok(res, {
      message: 'Payment cancellation processed',
      orderNumber: tran_id,
      status: 'cancelled'
    });
  } catch (error: any) {
    console.error('SSL Commerz payment cancellation processing failed:', error);
    return fail(res, { 
      message: error.message || 'Failed to process payment cancellation',
      code: 'PAYMENT_CANCELLATION_PROCESSING_FAILED' 
    }, 500);
  }
});

// IPN (Instant Payment Notification) handler
export const ipnHandler = asyncHandler(async (req: Request, res: Response) => {
  try {
    await sslCommerzService.processIPN(req.body);
    
    // SSL Commerz expects a specific response format
    res.status(200).send('SUCCESS');
  } catch (error: any) {
    console.error('SSL Commerz IPN processing failed:', error);
    res.status(400).send('FAILED');
  }
});

// Get payment methods
export const getPaymentMethods = asyncHandler(async (req: Request, res: Response) => {
  try {
    const paymentMethods = sslCommerzService.getPaymentMethods();
    const configStatus = sslCommerzService.getConfigStatus();

    ok(res, {
      paymentMethods,
      configured: configStatus.configured,
      sandbox: configStatus.sandbox,
      supportedMethods: [
        'bKash',
        'Nagad', 
        'Rocket',
        'Visa',
        'Mastercard',
        'American Express',
        'Mobile Banking',
        'Internet Banking',
        'Bank Transfer'
      ]
    });
  } catch (error: any) {
    console.error('Failed to get SSL Commerz payment methods:', error);
    return fail(res, { 
      message: error.message || 'Failed to get payment methods',
      code: 'PAYMENT_METHODS_FETCH_FAILED' 
    }, 500);
  }
});

// Get configuration status
export const getConfigStatus = asyncHandler(async (req: Request, res: Response) => {
  try {
    const configStatus = sslCommerzService.getConfigStatus();
    
    ok(res, configStatus);
  } catch (error: any) {
    console.error('Failed to get SSL Commerz configuration status:', error);
    return fail(res, { 
      message: error.message || 'Failed to get configuration status',
      code: 'CONFIG_STATUS_FETCH_FAILED' 
    }, 500);
  }
});

// Validate payment
export const validatePayment = asyncHandler(async (req: Request, res: Response) => {
  const { valId, amount, currency } = req.body;

  if (!valId || !amount || !currency) {
    return fail(res, { 
      message: 'valId, amount, and currency are required',
      code: 'VALIDATION_PARAMETERS_REQUIRED' 
    }, 400);
  }

  try {
    const validationResponse = await sslCommerzService.validatePayment(valId, amount, currency);
    
    ok(res, validationResponse);
  } catch (error: any) {
    console.error('SSL Commerz payment validation failed:', error);
    return fail(res, { 
      message: error.message || 'Failed to validate payment',
      code: 'PAYMENT_VALIDATION_FAILED' 
    }, 500);
  }
});
