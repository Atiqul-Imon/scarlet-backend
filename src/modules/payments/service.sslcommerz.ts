import { getSSLCommerzGateway } from './gateways/sslcommerz.js';

export interface CustomerInfo {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  postcode: string;
}

export interface PaymentItem {
  name: string;
  category: string;
  quantity: number;
  price: string;
}

export interface CreatePaymentParams {
  orderId: string;
  amount: string;
  currency: string;
  customerInfo: CustomerInfo;
  items: PaymentItem[];
}

export interface PaymentSession {
  sessionKey: string;
  gatewayUrl: string;
  orderId: string;
}

export interface PaymentVerification {
  status: string;
  transactionId?: string;
  amount?: string;
  currency?: string;
  paymentMethod?: string;
  bankTransactionId?: string;
}

export interface RefundResult {
  status: string;
  refundId?: string;
  amount?: string;
  message?: string;
}

/**
 * Create a new payment session with SSLCommerz
 */
export async function createPayment(params: CreatePaymentParams): Promise<PaymentSession> {
  try {
    const gateway = getSSLCommerzGateway();
    
    // Convert params to gateway format
    const paymentData = {
      orderId: params.orderId,
      amount: parseFloat(params.amount),
      currency: params.currency,
      customerName: params.customerInfo.name,
      customerEmail: params.customerInfo.email,
      customerPhone: params.customerInfo.phone,
      customerAddress: params.customerInfo.address,
      customerCity: params.customerInfo.city,
      customerCountry: params.customerInfo.country,
      productName: params.items.map(item => item.name).join(', '),
      productCategory: params.items[0]?.category || 'Beauty',
      shippingMethod: 'NO'
    };

    const result = await gateway.initiatePayment(paymentData);

    if (!result.success || !result.sessionKey) {
      throw new Error(result.error || 'Failed to create payment session');
    }

    return {
      sessionKey: result.sessionKey,
      gatewayUrl: result.gatewayUrl || '',
      orderId: params.orderId
    };
  } catch (error) {
    console.error('Error creating payment:', error);
    throw error;
  }
}

/**
 * Verify payment status with SSLCommerz
 */
export async function verifyPayment(sessionKey: string, orderId: string): Promise<PaymentVerification> {
  try {
    const gateway = getSSLCommerzGateway();
    const result = await gateway.queryTransaction(orderId);
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to verify payment');
    }

    return {
      status: result.status || 'unknown',
      transactionId: result.data?.tran_id,
      amount: result.data?.amount,
      currency: result.data?.currency,
      paymentMethod: result.data?.card_type,
      bankTransactionId: result.data?.bank_tran_id
    };
  } catch (error) {
    console.error('Error verifying payment:', error);
    throw error;
  }
}

/**
 * Handle SSLCommerz IPN (Instant Payment Notification)
 */
export async function handleIPN(ipnData: any): Promise<{ success: boolean; error?: string }> {
  try {
    const gateway = getSSLCommerzGateway();
    
    // Validate the IPN signature
    const isValidSignature = gateway.verifyIPNSignature(ipnData);
    
    if (!isValidSignature) {
      console.error('Invalid IPN signature');
      return { success: false, error: 'Invalid IPN signature' };
    }

    // Extract payment information
    const {
      tran_id: transactionId,
      status,
      amount,
      currency,
      card_type: paymentMethod,
      bank_tran_id: bankTransactionId,
      store_amount,
      currency_type,
      currency_amount,
      currency_rate,
      base_fair,
      value_a,
      value_b,
      value_c,
      value_d,
      risk_title,
      risk_level,
      APIConnect,
      validated_on,
      gw_version
    } = ipnData;

    console.log('Processing IPN for transaction:', transactionId);
    console.log('Payment status:', status);
    console.log('Amount:', amount);

    // Update order status based on payment result
    if (status === 'VALID') {
      // Payment successful - update order to confirmed/paid
      console.log('Payment successful for order:', transactionId);
      
      // TODO: Update order status in database
      // await updateOrderStatus(transactionId, 'paid', {
      //   amount,
      //   currency,
      //   paymentMethod,
      //   bankTransactionId
      // });
      
    } else if (status === 'FAILED') {
      // Payment failed - update order to failed
      console.log('Payment failed for order:', transactionId);
      
      // TODO: Update order status in database
      // await updateOrderStatus(transactionId, 'failed', {
      //   reason: 'Payment failed',
      //   amount,
      //   currency
      // });
      
    } else if (status === 'CANCELLED') {
      // Payment cancelled - update order to cancelled
      console.log('Payment cancelled for order:', transactionId);
      
      // TODO: Update order status in database
      // await updateOrderStatus(transactionId, 'cancelled', {
      //   reason: 'Payment cancelled',
      //   amount,
      //   currency
      // });
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error handling IPN:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Process a refund through SSLCommerz
 */
export async function processRefund(
  transactionId: string, 
  amount: string, 
  reason?: string
): Promise<RefundResult> {
  try {
    const gateway = getSSLCommerzGateway();
    
    console.log('Processing refund for transaction:', transactionId);
    console.log('Refund amount:', amount);
    console.log('Reason:', reason);

    const result = await gateway.processRefund(transactionId, parseFloat(amount), reason || 'Customer request');
    
    if (result.success) {
      return {
        status: 'success',
        refundId: result.refundId,
        amount,
        message: 'Refund processed successfully'
      };
    } else {
      return {
        status: 'failed',
        message: result.error || 'Refund processing failed'
      };
    }
  } catch (error: any) {
    console.error('Error processing refund:', error);
    return {
      status: 'failed',
      message: error.message
    };
  }
}

/**
 * Helper function to update order status (placeholder)
 * This would integrate with your existing order management system
 */
// async function updateOrderStatus(orderId: string, status: string, paymentData: any) {
//   // TODO: Implement order status update
//   // This would typically update your orders collection in MongoDB
//   console.log('Updating order status:', { orderId, status, paymentData });
// }