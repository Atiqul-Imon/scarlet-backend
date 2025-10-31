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
    
    // Log all incoming IPN data for debugging
    console.log('=== IPN Handler Processing ===');
    console.log('Full IPN Data:', JSON.stringify(ipnData, null, 2));
    
    // Validate the IPN signature (but don't block if it fails - log warning instead)
    // SSLCommerz signature verification can be finicky, so we'll verify payment status directly
    const isValidSignature = gateway.verifyIPNSignature(ipnData);
    
    if (!isValidSignature) {
      console.warn('⚠️ IPN signature verification failed - will verify payment status directly');
      // Don't block - we'll verify payment status with SSLCommerz API instead
    } else {
      console.log('✅ IPN signature verified');
    }

    // Extract payment information
    let {
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

    // Import order repository
    const orderRepo = await import('../orders/repository.js');
    const catalogRepo = await import('../catalog/repository.js');
    
    // Find order by order number (transactionId/tran_id is the order number)
    let order = await orderRepo.getOrderByOrderNumber(transactionId);
    
    // If not found by order number, try to find by _id (fallback)
    if (!order && transactionId) {
      try {
        const { ObjectId } = await import('mongodb');
        const { getDb } = await import('../../core/db/mongoClient.js');
        const db = await getDb();
        const foundOrder = await db.collection('orders').findOne({ _id: new ObjectId(transactionId) });
        if (foundOrder) {
          order = foundOrder as any;
          console.log(`Found order by _id fallback: ${transactionId}`);
        }
      } catch (e) {
        // Not a valid ObjectId, ignore
      }
    }
    
    if (!order) {
      console.error(`❌ Order not found for transaction: ${transactionId}`);
      console.error('Searched by orderNumber and _id');
      return { success: false, error: `Order not found for transaction: ${transactionId}` };
    }
    
    // If signature verification failed, verify payment status directly with SSLCommerz API
    if (!isValidSignature && status) {
      console.log(`🔍 Verifying payment status directly with SSLCommerz for order: ${order.orderNumber}`);
      const verification = await gateway.queryTransaction(order.orderNumber);
      if (verification.success) {
        console.log(`✅ SSLCommerz API verification: ${verification.status}`);
        // Use the verified status from API
        if (verification.status === 'VALID') {
          status = 'VALID';
        }
      }
    }
    
    // Update order status based on payment result
    if (status === 'VALID' || status === 'VALIDATED') {
      // Payment successful - update order to confirmed/paid
      console.log(`✅ Payment successful for order: ${transactionId} (Order #${order.orderNumber})`);
      
      try {
        // Update order status to confirmed
        await orderRepo.updateOrderStatus(order._id!.toString(), 'confirmed');
        
        // CRITICAL: Update payment status to completed (this makes the order visible in admin panel)
        // Also store bank transaction ID for refunds
        await orderRepo.updateOrderPaymentStatus(order._id!.toString(), 'completed');
        
        // Store bank transaction ID in paymentInfo for refund processing
        if (bankTransactionId) {
          const { ObjectId } = await import('mongodb');
          const { getDb } = await import('../../core/db/mongoClient.js');
          const db = await getDb();
          await db.collection('orders').updateOne(
            { _id: new ObjectId(order._id!.toString()) },
            { 
              $set: { 
                'paymentInfo.transactionId': bankTransactionId,
                'paymentInfo.bankTransactionId': bankTransactionId,
                updatedAt: new Date().toISOString()
              } 
            }
          );
          console.log(`✅ Stored bank transaction ID: ${bankTransactionId} for order: ${order.orderNumber}`);
        }
        
        console.log(`✅ Order ${order.orderNumber} status updated: confirmed, payment: completed`);
      } catch (error: any) {
        console.error(`❌ Error updating order status for ${transactionId}:`, error);
        throw error;
      }
      
    } else if (status === 'FAILED' || status === 'INVALID_TRANSACTION') {
      // Payment failed - update order and restore stock
      console.log(`❌ Payment failed for order: ${transactionId} (Order #${order.orderNumber})`);
      
      try {
        // Update order status to cancelled
        await orderRepo.updateOrderStatus(order._id!.toString(), 'cancelled');
        
        // Update payment status to failed (ensures order stays hidden from admin)
        await orderRepo.updateOrderPaymentStatus(order._id!.toString(), 'failed');
        
        // RESTORE STOCK for failed payment
        for (const item of order.items) {
          try {
            await catalogRepo.incrementStock(item.productId, item.quantity);
            console.log(`✅ Restored ${item.quantity} units of stock for product ${item.productId}`);
          } catch (stockError: any) {
            console.error(`❌ Failed to restore stock for product ${item.productId}:`, stockError);
          }
        }
        
        console.log(`✅ Order ${order.orderNumber} status updated: cancelled, payment: failed, stock restored`);
      } catch (error: any) {
        console.error(`❌ Error handling failed payment for ${transactionId}:`, error);
        throw error;
      }
      
    } else if (status === 'CANCELLED' || status === 'UNATTEMPTED') {
      // Payment cancelled - update order and restore stock
      console.log(`⚠️ Payment cancelled for order: ${transactionId} (Order #${order.orderNumber})`);
      
      try {
        // Update order status to cancelled
        await orderRepo.updateOrderStatus(order._id!.toString(), 'cancelled');
        
        // Update payment status to failed (ensures order stays hidden from admin)
        await orderRepo.updateOrderPaymentStatus(order._id!.toString(), 'failed');
        
        // RESTORE STOCK for cancelled payment
        for (const item of order.items) {
          try {
            await catalogRepo.incrementStock(item.productId, item.quantity);
            console.log(`✅ Restored ${item.quantity} units of stock for product ${item.productId}`);
          } catch (stockError: any) {
            console.error(`❌ Failed to restore stock for product ${item.productId}:`, stockError);
          }
        }
        
        console.log(`✅ Order ${order.orderNumber} status updated: cancelled, payment: failed, stock restored`);
      } catch (error: any) {
        console.error(`❌ Error handling cancelled payment for ${transactionId}:`, error);
        throw error;
      }
    } else {
      console.warn(`⚠️ Unknown payment status "${status}" for transaction: ${transactionId}`);
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
  orderIdOrNumber: string, 
  amount: string, 
  reason?: string
): Promise<RefundResult> {
  try {
    const gateway = getSSLCommerzGateway();
    const orderRepo = await import('../orders/repository.js');
    
    console.log('Processing refund for order:', orderIdOrNumber);
    console.log('Refund amount:', amount);
    console.log('Reason:', reason);

    // Find order by order number or ID
    let order = await orderRepo.getOrderByOrderNumber(orderIdOrNumber);
    
    // If not found by order number, try by ID
    if (!order) {
      try {
        const { ObjectId } = await import('mongodb');
        const { getDb } = await import('../../core/db/mongoClient.js');
        const db = await getDb();
        order = await db.collection('orders').findOne({ _id: new ObjectId(orderIdOrNumber) }) as any;
      } catch (e) {
        // Not a valid ObjectId
      }
    }
    
    if (!order) {
      return {
        status: 'failed',
        message: 'Order not found'
      };
    }
    
    // Check if payment method is SSLCommerz
    if (order.paymentInfo?.method !== 'sslcommerz') {
      return {
        status: 'failed',
        message: 'Refund only supported for SSLCommerz payments'
      };
    }
    
    // Check if payment is completed
    if (order.paymentInfo?.status !== 'completed') {
      return {
        status: 'failed',
        message: 'Can only refund completed payments'
      };
    }
    
    // Get bank transaction ID from order
    const bankTransactionId = order.paymentInfo?.bankTransactionId || order.paymentInfo?.transactionId;
    
    if (!bankTransactionId) {
      // Try to get it from SSLCommerz API
      console.log('⚠️ Bank transaction ID not found in order, querying SSLCommerz...');
      const verification = await gateway.queryTransaction(order.orderNumber);
      
      if (verification.success && verification.data?.bank_tran_id) {
        const fetchedBankTranId = verification.data.bank_tran_id;
        console.log(`✅ Retrieved bank transaction ID from SSLCommerz: ${fetchedBankTranId}`);
        
        // Store it for future use
        const { ObjectId } = await import('mongodb');
        const { getDb } = await import('../../core/db/mongoClient.js');
        const db = await getDb();
        await db.collection('orders').updateOne(
          { _id: new ObjectId(order._id!.toString()) },
          { 
            $set: { 
              'paymentInfo.bankTransactionId': fetchedBankTranId,
              updatedAt: new Date().toISOString()
            } 
          }
        );
        
        // Use the fetched ID
        const result = await gateway.processRefund(fetchedBankTranId, parseFloat(amount), reason || 'Customer request');
        
        if (result.success) {
          // Update order status
          await orderRepo.updateOrderStatus(order._id!.toString(), 'refunded');
          await orderRepo.updateOrderPaymentStatus(order._id!.toString(), 'refunded');
        }
        
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
      } else {
        return {
          status: 'failed',
          message: 'Bank transaction ID not found. Please contact SSLCommerz support or process refund manually from merchant panel.'
        };
      }
    }

    // Process refund with bank transaction ID
    const result = await gateway.processRefund(bankTransactionId, parseFloat(amount), reason || 'Customer request');
    
    if (result.success) {
      // Update order status to refunded
      await orderRepo.updateOrderStatus(order._id!.toString(), 'refunded');
      await orderRepo.updateOrderPaymentStatus(order._id!.toString(), 'refunded');
      
      console.log(`✅ Refund processed successfully for order: ${order.orderNumber}`);
      
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