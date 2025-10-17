import axios from 'axios';
import crypto from 'crypto';
import { logger } from '../../../core/logging/logger.js';

interface SSLCommerzConfig {
  storeId: string;
  storePassword: string;
  sandbox: boolean;
  successUrl: string;
  failUrl: string;
  cancelUrl: string;
  ipnUrl: string;
}

interface PaymentRequest {
  orderId: string;
  amount: number;
  currency: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress?: string;
  customerCity?: string;
  customerCountry?: string;
  productName: string;
  productCategory?: string;
  shippingMethod?: string;
}

interface SSLCommerzResponse {
  status: string;
  failedreason?: string;
  sessionkey?: string;
  gw?: any;
  redirectGatewayURL?: string;
  directPaymentURLBank?: string;
  directPaymentURLCard?: string;
  directPaymentURL?: string;
  redirectGatewayURLFailed?: string;
  GatewayPageURL?: string;
  storeBanner?: string;
  storeLogo?: string;
  desc?: string;
  is_direct_pay_enable?: string;
}

interface ValidationResponse {
  status: string;
  tran_date: string;
  tran_id: string;
  val_id: string;
  amount: string;
  store_amount: string;
  bank_tran_id: string;
  card_type: string;
  card_no: string;
  card_issuer: string;
  card_brand: string;
  card_issuer_country: string;
  currency: string;
  currency_rate: string;
  error?: string;
  risk_level?: string;
  risk_title?: string;
}

export class SSLCommerzGateway {
  private config: SSLCommerzConfig;
  private baseUrl: string;

  constructor(config: SSLCommerzConfig) {
    this.config = config;
    this.baseUrl = config.sandbox
      ? 'https://sandbox.sslcommerz.com'
      : 'https://securepay.sslcommerz.com';
  }

  /**
   * Initialize payment session
   */
  async initiatePayment(paymentData: PaymentRequest): Promise<{
    success: boolean;
    sessionKey?: string;
    gatewayUrl?: string;
    error?: string;
  }> {
    try {
      logger.info({ 
        orderId: paymentData.orderId,
        successUrl: this.config.successUrl,
        failUrl: this.config.failUrl,
        cancelUrl: this.config.cancelUrl
      }, 'Initiating SSLCommerz payment with callback URLs');

      // Prepare payment parameters
      const params = {
        store_id: this.config.storeId,
        store_passwd: this.config.storePassword,
        total_amount: paymentData.amount.toFixed(2),
        currency: paymentData.currency,
        tran_id: paymentData.orderId,
        success_url: this.config.successUrl,
        fail_url: this.config.failUrl,
        cancel_url: this.config.cancelUrl,
        ipn_url: this.config.ipnUrl,

        // Customer information
        cus_name: paymentData.customerName,
        cus_email: paymentData.customerEmail,
        cus_phone: paymentData.customerPhone,
        cus_add1: paymentData.customerAddress || 'N/A',
        cus_city: paymentData.customerCity || 'Dhaka',
        cus_country: paymentData.customerCountry || 'Bangladesh',
        cus_postcode: '1000',

        // Product information
        product_name: paymentData.productName,
        product_category: paymentData.productCategory || 'Beauty',
        product_profile: 'general',

        // Shipping information (if applicable)
        shipping_method: paymentData.shippingMethod || 'NO',
        num_of_item: 1,

        // Additional parameters
        emi_option: 0,
        multi_card_name: 'visa,master,amex',
        value_a: paymentData.orderId, // Custom field for order tracking
      };

      // Log the actual parameters being sent to SSLCommerz
      logger.info({ 
        orderId: paymentData.orderId,
        sslcommerzParams: {
          success_url: params.success_url,
          fail_url: params.fail_url,
          cancel_url: params.cancel_url,
          ipn_url: params.ipn_url
        }
      }, 'Sending payment request to SSLCommerz with callback URLs');

      // Make API request
      const response = await axios.post<SSLCommerzResponse>(
        `${this.baseUrl}/gwprocess/v4/api.php`,
        new URLSearchParams(params as any).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          timeout: 30000,
        }
      );

      logger.info({ 
        orderId: paymentData.orderId, 
        status: response.data.status 
      }, 'SSLCommerz response received');

      if (response.data.status === 'SUCCESS') {
        return {
          success: true,
          sessionKey: response.data.sessionkey,
          gatewayUrl: response.data.GatewayPageURL || response.data.redirectGatewayURL,
        };
      } else {
        logger.error({ 
          orderId: paymentData.orderId, 
          reason: response.data.failedreason 
        }, 'SSLCommerz payment initiation failed');

        return {
          success: false,
          error: response.data.failedreason || 'Payment initiation failed',
        };
      }
    } catch (error: any) {
      logger.error({ 
        error, 
        orderId: paymentData.orderId 
      }, 'SSLCommerz payment initiation error');

      return {
        success: false,
        error: error.message || 'Failed to initiate payment',
      };
    }
  }

  /**
   * Validate payment after completion
   */
  async validatePayment(validationId: string, orderId: string): Promise<{
    success: boolean;
    data?: ValidationResponse;
    error?: string;
  }> {
    try {
      logger.info({ orderId, validationId }, 'Validating SSLCommerz payment');

      const params = {
        val_id: validationId,
        store_id: this.config.storeId,
        store_passwd: this.config.storePassword,
        format: 'json',
      };

      const response = await axios.get<ValidationResponse>(
        `${this.baseUrl}/validator/api/validationserverAPI.php`,
        {
          params,
          timeout: 30000,
        }
      );

      logger.info({ 
        orderId, 
        status: response.data.status,
        amount: response.data.amount 
      }, 'SSLCommerz validation response received');

      if (response.data.status === 'VALID' || response.data.status === 'VALIDATED') {
        return {
          success: true,
          data: response.data,
        };
      } else {
        return {
          success: false,
          error: response.data.error || 'Payment validation failed',
        };
      }
    } catch (error: any) {
      logger.error({ 
        error, 
        orderId, 
        validationId 
      }, 'SSLCommerz validation error');

      return {
        success: false,
        error: error.message || 'Failed to validate payment',
      };
    }
  }

  /**
   * Verify IPN (Instant Payment Notification) signature
   */
  verifyIPNSignature(ipnData: any): boolean {
    try {
      // SSLCommerz sends verify_sign and verify_key
      const { verify_sign, verify_key } = ipnData;

      if (!verify_sign || !verify_key) {
        logger.warn('IPN signature verification failed: missing signature data');
        return false;
      }

      // Verify with SSLCommerz API
      // In production, you should verify the signature matches
      // For now, we'll do basic validation
      const expectedSign = crypto
        .createHash('md5')
        .update(this.config.storePassword + verify_key)
        .digest('hex');

      return verify_sign === expectedSign;
    } catch (error) {
      logger.error({ error }, 'IPN signature verification error');
      return false;
    }
  }

  /**
   * Process refund
   */
  async processRefund(bankTransactionId: string, refundAmount: number, refundReason: string): Promise<{
    success: boolean;
    refundId?: string;
    error?: string;
  }> {
    try {
      logger.info({ 
        bankTransactionId, 
        refundAmount 
      }, 'Processing SSLCommerz refund');

      const params = {
        refund_amount: refundAmount.toFixed(2),
        refund_remarks: refundReason,
        bank_tran_id: bankTransactionId,
        store_id: this.config.storeId,
        store_passwd: this.config.storePassword,
        format: 'json',
      };

      const response = await axios.post(
        `${this.baseUrl}/validator/api/merchantTransIDvalidationAPI.php`,
        new URLSearchParams(params as any).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          timeout: 30000,
        }
      );

      logger.info({ 
        bankTransactionId, 
        response: response.data 
      }, 'SSLCommerz refund response received');

      if (response.data.status === 'SUCCESS') {
        return {
          success: true,
          refundId: response.data.refund_ref_id,
        };
      } else {
        return {
          success: false,
          error: response.data.errorReason || 'Refund processing failed',
        };
      }
    } catch (error: any) {
      logger.error({ 
        error, 
        bankTransactionId 
      }, 'SSLCommerz refund error');

      return {
        success: false,
        error: error.message || 'Failed to process refund',
      };
    }
  }

  /**
   * Query transaction status
   */
  async queryTransaction(orderId: string): Promise<{
    success: boolean;
    status?: string;
    data?: any;
    error?: string;
  }> {
    try {
      logger.info({ orderId }, 'Querying SSLCommerz transaction');

      const params = {
        tran_id: orderId,
        store_id: this.config.storeId,
        store_passwd: this.config.storePassword,
        format: 'json',
      };

      const response = await axios.get(
        `${this.baseUrl}/validator/api/merchantTransIDvalidationAPI.php`,
        {
          params,
          timeout: 30000,
        }
      );

      logger.info({ 
        orderId, 
        status: response.data.status 
      }, 'SSLCommerz transaction query response received');

      return {
        success: true,
        status: response.data.status,
        data: response.data,
      };
    } catch (error: any) {
      logger.error({ 
        error, 
        orderId 
      }, 'SSLCommerz transaction query error');

      return {
        success: false,
        error: error.message || 'Failed to query transaction',
      };
    }
  }

  /**
   * Check if gateway is in sandbox mode
   */
  isSandbox(): boolean {
    return this.config.sandbox;
  }

  /**
   * Get gateway information
   */
  getGatewayInfo(): {
    name: string;
    sandbox: boolean;
    supportedPaymentMethods: string[];
  } {
    return {
      name: 'SSLCommerz',
      sandbox: this.config.sandbox,
      supportedPaymentMethods: [
        'visa',
        'mastercard',
        'amex',
        'bkash',
        'nagad',
        'rocket',
        'upay',
        'tap',
        'dbbl_mobile_banking',
        'city_touch',
        'internet_banking',
      ],
    };
  }
}

// Create fresh gateway instance every time to ensure latest environment variables
export function getSSLCommerzGateway(): SSLCommerzGateway {
  const config: SSLCommerzConfig = {
    storeId: process.env.SSLCOMMERZ_STORE_ID || '',
    storePassword: process.env.SSLCOMMERZ_STORE_PASSWORD || '',
    sandbox: process.env.SSLCOMMERZ_SANDBOX === 'true',
    successUrl: process.env.SSLCOMMERZ_SUCCESS_URL || 'http://localhost:3000/payment/success',
    failUrl: process.env.SSLCOMMERZ_FAIL_URL || 'http://localhost:3000/payment/failed',
    cancelUrl: process.env.SSLCOMMERZ_CANCEL_URL || 'http://localhost:3000/payment/cancelled',
    ipnUrl: process.env.SSLCOMMERZ_IPN_URL || 'http://localhost:4000/api/payments/webhook/sslcommerz',
  };

  logger.info({ 
    successUrl: config.successUrl,
    failUrl: config.failUrl,
    cancelUrl: config.cancelUrl,
    timestamp: new Date().toISOString()
  }, 'Creating fresh SSLCommerz gateway instance with current environment variables');
  
  return new SSLCommerzGateway(config);
}

export default SSLCommerzGateway;

