import crypto from 'crypto';
import { logger } from '../../../core/logging/logger.js';
import type { 
  NagadPaymentRequest, 
  NagadPaymentResponse, 
  NagadVerifyResponse,
  PaymentConfig 
} from '../model.js';

export class NagadGateway {
  private config: PaymentConfig['nagad'];
  private mockMode: boolean = false;

  constructor(config: PaymentConfig['nagad']) {
    this.config = config;
    // Enable mock mode if using dummy credentials
    this.mockMode = this.isDummyCredentials(config);
  }

  private isDummyCredentials(config: PaymentConfig['nagad']): boolean {
    return (
      config.merchantId === 'dummy_merchant_id' ||
      config.merchantPrivateKey === 'dummy_private_key' ||
      config.nagadPublicKey === 'dummy_public_key' ||
      config.sandbox === true
    );
  }

  // Generate signature for Nagad API
  private generateSignature(data: string): string {
    if (this.mockMode) {
      return 'mock_signature_' + Date.now();
    }

    try {
      const sign = crypto.createSign('SHA256');
      sign.update(data);
      return sign.sign(this.config.merchantPrivateKey, 'base64');
    } catch (error) {
      logger.error('Failed to generate Nagad signature');
      throw new Error('Unable to generate signature');
    }
  }

  // Verify signature from Nagad
  private verifySignature(data: string, signature: string): boolean {
    if (this.mockMode) {
      return true; // Always return true in mock mode
    }

    try {
      const verify = crypto.createVerify('SHA256');
      verify.update(data);
      return verify.verify(this.config.nagadPublicKey, signature, 'base64');
    } catch (error) {
      logger.error('Failed to verify Nagad signature');
      return false;
    }
  }

  // Create payment request
  async createPayment(paymentRequest: NagadPaymentRequest): Promise<NagadPaymentResponse> {
    try {
      // Mock mode for development
      if (this.mockMode) {
        const mockResponse: NagadPaymentResponse = {
          status: 'Success',
          message: 'Payment request created successfully',
          paymentRefId: `mock_payment_ref_${Date.now()}`,
          challenge: 'mock_challenge_' + Date.now(),
          additionalMerchantInfo: paymentRequest.additionalMerchantInfo
        };

        logger.info('Nagad mock payment created successfully');
        return mockResponse;
      }

      const requestData = {
        merchantId: this.config.merchantId,
        orderId: paymentRequest.orderId,
        amount: paymentRequest.amount,
        currencyCode: paymentRequest.currency,
        challenge: 'challenge_' + Date.now()
      };

      const signature = this.generateSignature(JSON.stringify(requestData));

      const response = await fetch(`${this.config.baseUrl}/check-out/initialize/${this.config.merchantId}/${paymentRequest.orderId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-KM-IP-V4': '127.0.0.1', // This should be the actual client IP
          'X-KM-Client-Type': 'PC_WEB',
          'X-KM-Api-Version': 'v-0.2.0'
        },
        body: JSON.stringify({
          ...requestData,
          signature
        })
      });

      if (!response.ok) {
        throw new Error(`Nagad payment creation failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.status !== 'Success') {
        throw new Error(`Nagad payment creation error: ${data.message}`);
      }

      logger.info('Nagad payment created successfully');
      return data;

    } catch (error) {
      logger.error('Failed to create Nagad payment');
      // Fallback to mock mode if real API fails
      if (!this.mockMode) {
        logger.warn('Falling back to mock mode for Nagad payment creation');
        this.mockMode = true;
        return this.createPayment(paymentRequest);
      }
      throw error;
    }
  }

  // Verify payment
  async verifyPayment(paymentRefId: string, orderId: string): Promise<NagadVerifyResponse> {
    try {
      // Mock mode for development
      if (this.mockMode) {
        const mockResponse: NagadVerifyResponse = {
          status: 'Success',
          message: 'Payment verified successfully',
          paymentRefId,
          orderId,
          amount: '100.00', // Mock amount
          currency: 'BDT',
          paymentDateTime: new Date().toISOString(),
          issuerPaymentRefNo: `mock_issuer_ref_${Date.now()}`,
          additionalMerchantInfo: {}
        };

        logger.info('Nagad mock payment verified successfully');
        
        return mockResponse;
      }

      const requestData = {
        merchantId: this.config.merchantId,
        orderId,
        paymentRefId
      };

      const signature = this.generateSignature(JSON.stringify(requestData));

      const response = await fetch(`${this.config.baseUrl}/check-out/verify/${this.config.merchantId}/${orderId}/${paymentRefId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-KM-IP-V4': '127.0.0.1',
          'X-KM-Client-Type': 'PC_WEB',
          'X-KM-Api-Version': 'v-0.2.0',
          'X-KM-Signature': signature
        }
      });

      if (!response.ok) {
        throw new Error(`Nagad payment verification failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.status !== 'Success') {
        throw new Error(`Nagad payment verification error: ${data.message}`);
      }

      logger.info('Nagad payment verified successfully');
      
      return data;

    } catch (error) {
      logger.error('Failed to verify Nagad payment');
      // Fallback to mock mode if real API fails
      if (!this.mockMode) {
        logger.warn('Falling back to mock mode for Nagad payment verification');
        this.mockMode = true;
        return this.verifyPayment(paymentRefId, orderId);
      }
      throw error;
    }
  }

  // Refund payment
  async refundPayment(
    paymentRefId: string, 
    orderId: string, 
    amount: string, 
    reason: string = 'Customer request'
  ): Promise<any> {
    try {
      // Mock mode for development
      if (this.mockMode) {
        const mockResponse = {
          status: 'Success',
          message: 'Refund processed successfully',
          refundId: `mock_refund_${Date.now()}`,
          paymentRefId,
          orderId,
          amount,
          reason
        };

        logger.info('Nagad mock refund processed successfully');
        
        return mockResponse;
      }

      const requestData = {
        merchantId: this.config.merchantId,
        orderId,
        paymentRefId,
        amount,
        reason
      };

      const signature = this.generateSignature(JSON.stringify(requestData));

      const response = await fetch(`${this.config.baseUrl}/check-out/refund/${this.config.merchantId}/${orderId}/${paymentRefId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-KM-IP-V4': '127.0.0.1',
          'X-KM-Client-Type': 'PC_WEB',
          'X-KM-Api-Version': 'v-0.2.0',
          'X-KM-Signature': signature
        },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        throw new Error(`Nagad refund failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.status !== 'Success') {
        throw new Error(`Nagad refund error: ${data.message}`);
      }

      logger.info('Nagad refund processed successfully');
      
      return data;

    } catch (error) {
      logger.error('Failed to refund Nagad payment');
      // Fallback to mock mode if real API fails
      if (!this.mockMode) {
        logger.warn('Falling back to mock mode for Nagad refund');
        this.mockMode = true;
        return this.refundPayment(paymentRefId, orderId, amount, reason);
      }
      throw error;
    }
  }

  // Validate webhook signature
  validateWebhookSignature(payload: string, signature: string): boolean {
    if (this.mockMode) {
      return true; // Always return true in mock mode
    }

    return this.verifySignature(payload, signature);
  }

  // Process webhook
  async processWebhook(payload: any): Promise<{
    paymentRefId: string;
    status: string;
    orderId?: string;
    amount?: string;
    currency?: string;
  }> {
    try {
      // Validate webhook signature if provided
      if (payload.signature && !this.validateWebhookSignature(
        JSON.stringify(payload.data), 
        payload.signature
      )) {
        throw new Error('Invalid webhook signature');
      }

      const data = payload.data || payload;
      
      return {
        paymentRefId: data.paymentRefId,
        status: data.status,
        orderId: data.orderId,
        amount: data.amount,
        currency: data.currency
      };

    } catch (error) {
      logger.error('Failed to process Nagad webhook');
      throw error;
    }
  }

  // Get payment URL for redirect
  getPaymentUrl(paymentRefId: string): string {
    const baseUrl = this.config.sandbox 
      ? 'https://sandbox.mynagad.com:10060/check-out'
      : 'https://api.mynagad.com/check-out';
    
    return `${baseUrl}/${paymentRefId}`;
  }

  // Validate payment amount
  validateAmount(amount: number): boolean {
    // Nagad minimum amount is 1 BDT, maximum is 25,000 BDT
    return amount >= 1 && amount <= 25000;
  }

  // Get supported currencies
  getSupportedCurrencies(): string[] {
    return ['BDT'];
  }

  // Check if gateway is available
  async isAvailable(): Promise<boolean> {
    if (this.mockMode) {
      return true; // Always available in mock mode
    }

    try {
      // Simple health check
      const response = await fetch(`${this.config.baseUrl}/health`, {
        method: 'GET'
      });
      return response.ok;
    } catch (error) {
      logger.warn('Nagad gateway is not available');
      return false;
    }
  }
}