import { SSLCommerzGateway, SSLCommerzConfig, SSLCommerzPaymentRequest, SSLCommerzValidationResponse } from '../gateways/sslcommerz.js';
import { env } from '../../config/env.js';
import { Order, OrderStatus } from '../../orders/model.js';
import { getDb } from '../../core/db/mongoClient.js';
import { ObjectId } from 'mongodb';

export class SSLCommerzService {
  private gateway: SSLCommerzGateway;

  constructor() {
    const config: SSLCommerzConfig = {
      storeId: env.sslCommerzStoreId || '',
      storePassword: env.sslCommerzStorePassword || '',
      sandbox: env.sslCommerzSandbox === 'true',
      successUrl: env.sslCommerzSuccessUrl,
      failUrl: env.sslCommerzFailUrl,
      cancelUrl: env.sslCommerzCancelUrl,
      ipnUrl: env.sslCommerzIpnUrl
    };

    this.gateway = new SSLCommerzGateway(config);
  }

  /**
   * Create payment session for an order
   */
  async createPaymentSession(order: Order): Promise<{
    sessionKey: string;
    gatewayUrl: string;
    paymentMethods: string[];
  }> {
    if (!env.sslCommerzStoreId || !env.sslCommerzStorePassword) {
      throw new Error('SSL Commerz configuration is missing');
    }

    // Prepare payment data
    const paymentData: Partial<SSLCommerzPaymentRequest> = {
      total_amount: order.total,
      currency: order.currency,
      tran_id: order.orderNumber,
      cus_name: `${order.shippingAddress.firstName} ${order.shippingAddress.lastName}`,
      cus_email: order.shippingAddress.email,
      cus_phone: order.shippingAddress.phone,
      cus_add1: order.shippingAddress.address,
      cus_city: order.shippingAddress.city,
      cus_state: order.shippingAddress.state,
      cus_postcode: order.shippingAddress.postalCode,
      cus_country: order.shippingAddress.country,
      ship_name: `${order.shippingAddress.firstName} ${order.shippingAddress.lastName}`,
      ship_add1: order.shippingAddress.address,
      ship_city: order.shippingAddress.city,
      ship_state: order.shippingAddress.state,
      ship_postcode: order.shippingAddress.postalCode,
      ship_country: order.shippingAddress.country,
      product_name: 'Scarlet Beauty Products',
      product_category: 'Beauty & Skincare',
      product_profile: 'general',
      cart: order.items.map(item => ({
        product: item.productName,
        amount: item.price * item.quantity
      })),
      value_a: order._id || '',
      value_b: order.userId || '',
      value_c: order.isGuestOrder ? 'guest' : 'user',
      value_d: order.orderNumber
    };

    try {
      const response = await this.gateway.createPaymentSession(paymentData);
      
      if (response.status === 'SUCCESS' && response.sessionkey) {
        return {
          sessionKey: response.sessionkey,
          gatewayUrl: this.gateway.getGatewayUrl(response.sessionkey),
          paymentMethods: this.gateway.getPaymentMethods()
        };
      } else {
        throw new Error(response.failedreason || 'Failed to create payment session');
      }
    } catch (error) {
      console.error('SSL Commerz payment session creation failed:', error);
      throw new Error('Failed to create payment session');
    }
  }

  /**
   * Validate payment response
   */
  async validatePayment(valId: string, amount: number, currency: string): Promise<SSLCommerzValidationResponse> {
    try {
      const response = await this.gateway.validatePayment(valId, amount, currency);
      return response;
    } catch (error) {
      console.error('SSL Commerz payment validation failed:', error);
      throw new Error('Failed to validate payment');
    }
  }

  /**
   * Process payment callback
   */
  async processPaymentCallback(data: any): Promise<{
    orderId: string;
    status: OrderStatus;
    transactionId: string;
    amount: number;
    currency: string;
  }> {
    const { val_id, amount, currency, tran_id, status, bank_tran_id, card_type, store_amount } = data;

    if (!val_id || !amount || !currency || !tran_id) {
      throw new Error('Invalid payment callback data');
    }

    // Validate payment
    const validationResponse = await this.validatePayment(val_id, parseFloat(amount), currency);

    if (validationResponse.status !== 'VALID') {
      throw new Error('Payment validation failed');
    }

    // Find order by transaction ID (order number)
    const db = await getDb();
    const order = await db.collection<Order>('orders').findOne({ orderNumber: tran_id });

    if (!order) {
      throw new Error('Order not found');
    }

    // Update order status
    let orderStatus: OrderStatus;
    if (status === 'VALID' && validationResponse.status === 'VALID') {
      orderStatus = 'confirmed';
    } else if (status === 'FAILED') {
      orderStatus = 'cancelled';
    } else {
      orderStatus = 'pending';
    }

    // Update order in database
    await db.collection<Order>('orders').updateOne(
      { _id: new ObjectId(order._id) },
      {
        $set: {
          status: orderStatus,
          paymentInfo: {
            method: 'sslcommerz',
            status: orderStatus === 'confirmed' ? 'completed' : 'failed',
            transactionId: bank_tran_id || val_id,
            paymentDate: new Date().toISOString(),
            gatewayResponse: {
              val_id,
              bank_tran_id,
              card_type,
              store_amount,
              validation_response: validationResponse
            }
          },
          updatedAt: new Date().toISOString()
        }
      }
    );

    return {
      orderId: order._id || '',
      status: orderStatus,
      transactionId: bank_tran_id || val_id,
      amount: parseFloat(amount),
      currency
    };
  }

  /**
   * Process IPN (Instant Payment Notification)
   */
  async processIPN(data: any): Promise<void> {
    try {
      const { val_id, amount, currency, tran_id, status, verify_sign } = data;

      // Verify hash signature
      if (!this.gateway.verifyHash(data, verify_sign)) {
        console.error('SSL Commerz IPN hash verification failed');
        return;
      }

      // Process payment callback
      await this.processPaymentCallback(data);
      
      console.log('SSL Commerz IPN processed successfully:', { val_id, tran_id, status });
    } catch (error) {
      console.error('SSL Commerz IPN processing failed:', error);
      throw error;
    }
  }

  /**
   * Get payment methods
   */
  getPaymentMethods(): string[] {
    return this.gateway.getPaymentMethods();
  }

  /**
   * Check if SSL Commerz is configured
   */
  isConfigured(): boolean {
    return !!(env.sslCommerzStoreId && env.sslCommerzStorePassword);
  }

  /**
   * Get configuration status
   */
  getConfigStatus(): {
    configured: boolean;
    sandbox: boolean;
    storeId: string;
    successUrl: string;
    failUrl: string;
    cancelUrl: string;
    ipnUrl: string;
  } {
    return {
      configured: this.isConfigured(),
      sandbox: env.sslCommerzSandbox === 'true',
      storeId: env.sslCommerzStoreId || '',
      successUrl: env.sslCommerzSuccessUrl,
      failUrl: env.sslCommerzFailUrl,
      cancelUrl: env.sslCommerzCancelUrl,
      ipnUrl: env.sslCommerzIpnUrl
    };
  }
}
