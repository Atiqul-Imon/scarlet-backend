export type PaymentMethod = 'bkash' | 'nagad' | 'rocket' | 'card' | 'cod' | 'sslcommerz';
export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'refunded' | 'partially_refunded';
export type PaymentGateway = 'bkash' | 'nagad' | 'rocket' | 'stripe' | 'paypal' | 'manual';

// bKash specific types
export interface BkashPaymentRequest {
  amount: string;
  currency: string;
  intent: string;
  merchantInvoiceNumber: string;
  callbackURL: string;
  payerReference?: string;
}

export interface BkashPaymentResponse {
  paymentID: string;
  statusCode: string;
  statusMessage: string;
  paymentCreateTime: string;
  amount: string;
  currency: string;
  intent: string;
  merchantInvoiceNumber: string;
  transactionStatus: string;
  successCallbackURL: string;
  failCallbackURL: string;
  cancelledCallbackURL: string;
  payerReference: string;
  customerMsisdn: string;
}

export interface BkashExecuteResponse {
  paymentID: string;
  statusCode: string;
  statusMessage: string;
  paymentExecuteTime: string;
  amount: string;
  currency: string;
  intent: string;
  merchantInvoiceNumber: string;
  transactionStatus: string;
  successCallbackURL: string;
  failCallbackURL: string;
  cancelledCallbackURL: string;
  payerReference: string;
  customerMsisdn: string;
  trxID: string;
}

// Nagad specific types
export interface NagadPaymentRequest {
  amount: string;
  currency: string;
  orderId: string;
  callbackUrl: string;
  additionalMerchantInfo?: Record<string, any>;
}

export interface NagadPaymentResponse {
  status: string;
  message: string;
  paymentRefId: string;
  challenge: string;
  additionalMerchantInfo?: Record<string, any>;
}

export interface NagadVerifyResponse {
  status: string;
  message: string;
  paymentRefId: string;
  orderId: string;
  amount: string;
  currency: string;
  paymentDateTime: string;
  issuerPaymentRefNo: string;
  additionalMerchantInfo?: Record<string, any>;
}

// Generic payment interfaces
export interface PaymentTransaction {
  _id?: string;
  orderId: string;
  userId: string;
  paymentMethod: PaymentMethod;
  gateway: PaymentGateway;
  amount: number;
  currency: string;
  status: PaymentStatus;
  
  // Gateway specific data
  gatewayTransactionId?: string;
  gatewayReferenceId?: string;
  gatewayResponse?: Record<string, any>;
  
  // Payment details
  paymentDate?: string;
  completedAt?: string;
  failedAt?: string;
  cancelledAt?: string;
  
  // Refund information
  refundedAmount?: number;
  refundTransactions?: RefundTransaction[];
  
  // Error handling
  errorCode?: string;
  errorMessage?: string;
  retryCount?: number;
  
  // Metadata
  metadata?: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
}

export interface RefundTransaction {
  _id?: string;
  paymentTransactionId: string;
  refundId: string;
  amount: number;
  reason: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  gatewayRefundId?: string;
  gatewayResponse?: Record<string, any>;
  processedAt?: string;
  createdAt?: string;
}

export interface PaymentWebhook {
  _id?: string;
  transactionId: string;
  gateway: PaymentGateway;
  eventType: string;
  payload: Record<string, any>;
  signature?: string;
  processed: boolean;
  processedAt?: string;
  createdAt?: string;
}

// Payment request/response types
export interface CreatePaymentRequest {
  orderId: string;
  paymentMethod: PaymentMethod;
  amount: number;
  currency: string;
  returnUrl: string;
  cancelUrl: string;
  metadata?: Record<string, any>;
}

export interface CreatePaymentResponse {
  paymentId: string;
  status: PaymentStatus;
  gatewayUrl?: string;
  gatewayData?: Record<string, any>;
  expiresAt?: string;
}

export interface PaymentVerificationRequest {
  paymentId: string;
  gatewayData?: Record<string, any>;
}

export interface PaymentVerificationResponse {
  paymentId: string;
  status: PaymentStatus;
  transactionId?: string;
  amount: number;
  currency: string;
  paymentDate?: string;
  gatewayResponse?: Record<string, any>;
}

// Payment configuration
export interface PaymentConfig {
  bkash: {
    appKey: string;
    appSecret: string;
    username: string;
    password: string;
    sandbox: boolean;
    baseUrl: string;
    callbackUrl: string;
    merchantId: string;
  };
  nagad: {
    merchantId: string;
    merchantPrivateKey: string;
    nagadPublicKey: string;
    sandbox: boolean;
    baseUrl: string;
    callbackUrl: string;
  };
  rocket: {
    apiKey: string;
    secretKey: string;
    sandbox: boolean;
    baseUrl: string;
    callbackUrl: string;
  };
}

// Payment validation
export interface PaymentValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// Payment statistics
export interface PaymentStats {
  totalTransactions: number;
  successfulTransactions: number;
  failedTransactions: number;
  pendingTransactions: number;
  totalAmount: number;
  successfulAmount: number;
  failedAmount: number;
  pendingAmount: number;
  averageTransactionAmount: number;
  successRate: number;
  methodBreakdown: Record<PaymentMethod, {
    count: number;
    amount: number;
    successRate: number;
  }>;
}
