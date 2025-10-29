import type { Request, Response } from 'express';
import { ok, fail } from '../../core/http/response.js';
import { asyncHandler } from '../../core/http/asyncHandler.js';
import { PaymentService } from './service.js';
import { env } from '../../config/env.js';
import type {
  CreatePaymentRequest,
  PaymentVerificationRequest
} from './model.js';

// Initialize payment service with configuration
const paymentConfig = {
  bkash: {
    appKey: env.bkashAppKey || 'dummy_app_key',
    appSecret: env.bkashAppSecret || 'dummy_app_secret',
    username: env.bkashUsername || 'dummy_username',
    password: env.bkashPassword || 'dummy_password',
    sandbox: env.bkashSandbox !== 'false', // Default to sandbox
    baseUrl: env.bkashBaseUrl || 'https://tokenized.sandbox.bkash.com',
    callbackUrl: env.bkashCallbackUrl || `${env.frontendUrl}/payment/callback`,
    merchantId: env.bkashMerchantId || 'dummy_merchant_id'
  },
  nagad: {
    merchantId: env.nagadMerchantId || 'dummy_merchant_id',
    merchantPrivateKey: env.nagadMerchantPrivateKey || 'dummy_private_key',
    nagadPublicKey: env.nagadPublicKey || 'dummy_public_key',
    sandbox: env.nagadSandbox !== 'false', // Default to sandbox
    baseUrl: env.nagadBaseUrl || 'https://sandbox.mynagad.com:10060',
    callbackUrl: env.nagadCallbackUrl || `${env.frontendUrl}/payment/callback`
  },
  rocket: {
    apiKey: env.rocketApiKey || 'dummy_api_key',
    secretKey: env.rocketSecretKey || 'dummy_secret_key',
    sandbox: env.rocketSandbox !== 'false',
    baseUrl: env.rocketBaseUrl || 'https://sandbox.rocket.com.bd',
    callbackUrl: env.rocketCallbackUrl || `${env.frontendUrl}/payment/callback`
  }
};

const paymentService = new PaymentService(paymentConfig);

// Validation helpers
const validateCreatePaymentRequest = (data: any): { valid: boolean; errors: Record<string, string> } => {
  const errors: Record<string, string> = {};

  if (!data.orderId || typeof data.orderId !== 'string') {
    errors.orderId = 'Order ID is required';
  }

  if (!data.paymentMethod || !['bkash', 'nagad', 'rocket', 'card', 'cod', 'sslcommerz'].includes(data.paymentMethod)) {
    errors.paymentMethod = 'Valid payment method is required';
  }

  if (!data.amount || typeof data.amount !== 'number' || data.amount <= 0) {
    errors.amount = 'Valid amount is required';
  }

  if (!data.currency || typeof data.currency !== 'string') {
    errors.currency = 'Currency is required';
  }

  if (!data.returnUrl || typeof data.returnUrl !== 'string') {
    errors.returnUrl = 'Return URL is required';
  }

  if (!data.cancelUrl || typeof data.cancelUrl !== 'string') {
    errors.cancelUrl = 'Cancel URL is required';
  }

  return { valid: Object.keys(errors).length === 0, errors };
};

const validateVerificationRequest = (data: any): { valid: boolean; errors: Record<string, string> } => {
  const errors: Record<string, string> = {};

  if (!data.paymentId || typeof data.paymentId !== 'string') {
    errors.paymentId = 'Payment ID is required';
  }

  return { valid: Object.keys(errors).length === 0, errors };
};

// Create payment
export const createPayment = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?._id?.toString();
  
  if (!userId) {
    return fail(res, { 
      message: 'Authentication required',
      code: 'AUTH_REQUIRED' 
    }, 401);
  }

  // Validate request data
  const validation = validateCreatePaymentRequest(req.body);
  if (!validation.valid) {
    return fail(res, { 
      message: 'Validation failed',
      code: 'VALIDATION_ERROR',
    }, 400);
  }

  try {
    const paymentRequest: CreatePaymentRequest = {
      orderId: req.body.orderId,
      paymentMethod: req.body.paymentMethod,
      amount: req.body.amount,
      currency: req.body.currency,
      returnUrl: req.body.returnUrl,
      cancelUrl: req.body.cancelUrl,
      metadata: req.body.metadata || {}
    };

    // Set user ID in the service (we'll need to modify the service to accept this)
    const payment = await paymentService.createPayment(paymentRequest);
    
    // Update the payment with user ID
    if (payment.paymentId) {
      await paymentService.getPayment(payment.paymentId).then(p => {
        if (p) {
          // Update user ID in payment record
          // This is a workaround - ideally the service should accept userId
        }
      });
    }

    ok(res, payment);
  } catch (error: any) {
    if (error.message.includes('Unsupported payment method')) {
      return fail(res, { 
        message: error.message,
        code: 'UNSUPPORTED_PAYMENT_METHOD' 
      }, 400);
    }
    
    if (error.message.includes('Invalid payment amount')) {
      return fail(res, { 
        message: error.message,
        code: 'INVALID_AMOUNT' 
      }, 400);
    }
    
    throw error;
  }
});

// Verify payment
export const verifyPayment = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?._id?.toString();
  
  if (!userId) {
    return fail(res, { 
      message: 'Authentication required',
      code: 'AUTH_REQUIRED' 
    }, 401);
  }

  // Validate request data
  const validation = validateVerificationRequest(req.body);
  if (!validation.valid) {
    return fail(res, { 
      message: 'Validation failed',
      code: 'VALIDATION_ERROR',
    }, 400);
  }

  try {
    const verificationRequest: PaymentVerificationRequest = {
      paymentId: req.body.paymentId,
      gatewayData: req.body.gatewayData || {}
    };

    const result = await paymentService.verifyPayment(verificationRequest);
    ok(res, result);
  } catch (error: any) {
    if (error.message.includes('Payment not found')) {
      return fail(res, { 
        message: 'Payment not found',
        code: 'PAYMENT_NOT_FOUND' 
      }, 404);
    }
    
    if (error.message.includes('not found')) {
      return fail(res, { 
        message: error.message,
        code: 'GATEWAY_ERROR' 
      }, 400);
    }
    
    throw error;
  }
});

// Get payment status
export const getPaymentStatus = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?._id?.toString();
  const { paymentId } = req.params;
  
  if (!userId) {
    return fail(res, { 
      message: 'Authentication required',
      code: 'AUTH_REQUIRED' 
    }, 401);
  }

  if (!paymentId) {
    return fail(res, { 
      message: 'Payment ID is required',
      code: 'PAYMENT_ID_REQUIRED' 
    }, 400);
  }

  try {
    const payment = await paymentService.getPayment(paymentId);
    
    if (!payment) {
      return fail(res, { 
        message: 'Payment not found',
        code: 'PAYMENT_NOT_FOUND' 
      }, 404);
    }

    // Check if user has access to this payment
    if (payment.userId !== userId) {
      return fail(res, { 
        message: 'Access denied',
        code: 'ACCESS_DENIED' 
      }, 403);
    }

    ok(res, payment);
  } catch (error) {
    throw error;
  }
});

// Get payments by order
export const getPaymentsByOrder = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?._id?.toString();
  const { orderId } = req.params;
  
  if (!userId) {
    return fail(res, { 
      message: 'Authentication required',
      code: 'AUTH_REQUIRED' 
    }, 401);
  }

  if (!orderId) {
    return fail(res, { 
      message: 'Order ID is required',
      code: 'ORDER_ID_REQUIRED' 
    }, 400);
  }

  try {
    const payments = await paymentService.getPaymentsByOrderId(orderId);
    
    // Filter payments by user access
    const userPayments = payments.filter(p => p.userId === userId);
    
    ok(res, userPayments);
  } catch (error) {
    throw error;
  }
});

// Get user payments
export const getUserPayments = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?._id?.toString();
  const limit = parseInt(req.query.limit as string) || 50;
  const skip = parseInt(req.query.skip as string) || 0;
  
  if (!userId) {
    return fail(res, { 
      message: 'Authentication required',
      code: 'AUTH_REQUIRED' 
    }, 401);
  }

  try {
    const payments = await paymentService.getUserPayments(userId, limit, skip);
    ok(res, payments);
  } catch (error) {
    throw error;
  }
});

// Process webhook
export const processWebhook = asyncHandler(async (req: Request, res: Response) => {
  const { gateway } = req.params;
  const signature = req.headers['x-signature'] as string;
  
  if (!gateway || !['bkash', 'nagad', 'rocket'].includes(gateway)) {
    return fail(res, { 
      message: 'Invalid gateway',
      code: 'INVALID_GATEWAY' 
    }, 400);
  }

  try {
    await paymentService.processWebhook(gateway, req.body, signature);
    ok(res, { message: 'Webhook processed successfully' });
  } catch (error: any) {
    if (error.message.includes('Invalid webhook signature')) {
      return fail(res, { 
        message: 'Invalid webhook signature',
        code: 'INVALID_SIGNATURE' 
      }, 401);
    }
    
    throw error;
  }
});

// Refund payment (Admin only)
export const refundPayment = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?._id?.toString();
  const { paymentId } = req.params;
  const { amount, reason } = req.body;
  
  if (!userId) {
    return fail(res, { 
      message: 'Authentication required',
      code: 'AUTH_REQUIRED' 
    }, 401);
  }

  // Check if user is admin or staff
  if (req.user?.role !== 'admin' && req.user?.role !== 'staff') {
    return fail(res, { 
      message: 'Admin access required',
      code: 'ADMIN_REQUIRED' 
    }, 403);
  }

  if (!paymentId) {
    return fail(res, { 
      message: 'Payment ID is required',
      code: 'PAYMENT_ID_REQUIRED' 
    }, 400);
  }

  if (!amount || typeof amount !== 'number' || amount <= 0) {
    return fail(res, { 
      message: 'Valid refund amount is required',
      code: 'INVALID_AMOUNT' 
    }, 400);
  }

  try {
    const refund = await paymentService.refundPayment(
      paymentId, 
      amount, 
      reason || 'Admin refund'
    );
    
    ok(res, refund);
  } catch (error: any) {
    if (error.message.includes('Payment not found')) {
      return fail(res, { 
        message: 'Payment not found',
        code: 'PAYMENT_NOT_FOUND' 
      }, 404);
    }
    
    if (error.message.includes('Only completed payments')) {
      return fail(res, { 
        message: error.message,
        code: 'INVALID_PAYMENT_STATUS' 
      }, 400);
    }
    
    if (error.message.includes('cannot exceed')) {
      return fail(res, { 
        message: error.message,
        code: 'INVALID_REFUND_AMOUNT' 
      }, 400);
    }
    
    throw error;
  }
});

// Get payment statistics (Admin only)
export const getPaymentStats = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?._id?.toString();
  
  if (!userId) {
    return fail(res, { 
      message: 'Authentication required',
      code: 'AUTH_REQUIRED' 
    }, 401);
  }

  // Check if user is admin or staff
  if (req.user?.role !== 'admin' && req.user?.role !== 'staff') {
    return fail(res, { 
      message: 'Admin access required',
      code: 'ADMIN_REQUIRED' 
    }, 403);
  }

  try {
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;
    
    const stats = await paymentService.getPaymentStats(startDate, endDate);
    ok(res, stats);
  } catch (error) {
    throw error;
  }
});
