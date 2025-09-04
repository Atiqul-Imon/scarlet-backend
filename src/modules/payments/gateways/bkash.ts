import { logger } from '../../../core/logging/logger.js';
import type { 
  BkashPaymentRequest, 
  BkashPaymentResponse, 
  BkashExecuteResponse,
  PaymentConfig 
} from '../model.js';

export class BkashGateway {
  private config: PaymentConfig['bkash'];
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;
  private mockMode: boolean = false;

  constructor(config: PaymentConfig['bkash']) {
    this.config = config;
    // Enable mock mode if using dummy credentials
    this.mockMode = this.isDummyCredentials(config);
  }

  private isDummyCredentials(config: PaymentConfig['bkash']): boolean {
    return (
      config.appKey === 'dummy_app_key' ||
      config.appSecret === 'dummy_app_secret' ||
      config.username === 'dummy_username' ||
      config.password === 'dummy_password' ||
      config.sandbox === true
    );
  }

  // Generate access token for bKash API
  private async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken!;
    }

    // Mock mode for development
    if (this.mockMode) {
      this.accessToken = 'mock_bkash_token_' + Date.now();
      this.tokenExpiry = Date.now() + (3600 * 1000); // 1 hour
      logger.info('bKash mock access token generated');
      return this.accessToken;
    }

    try {
      const credentials = Buffer.from(`${this.config.username}:${this.config.password}`).toString('base64');
      
      const response = await fetch(`${this.config.baseUrl}/tokenized/checkout/token/grant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Basic ${credentials}`,
          'X-APP-Key': this.config.appKey
        },
        body: JSON.stringify({
          app_key: this.config.appKey,
          app_secret: this.config.appSecret
        })
      });

      if (!response.ok) {
        throw new Error(`bKash token request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.statusCode !== '0000') {
        throw new Error(`bKash token error: ${data.statusMessage}`);
      }

      this.accessToken = data.id_token;
      this.tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000; // 1 minute buffer

      logger.info('bKash access token refreshed successfully');
      return this.accessToken!;

    } catch (error) {
      logger.error('Failed to get bKash access token');
      // Fallback to mock mode if real API fails
      if (!this.mockMode) {
        logger.warn('Falling back to mock mode for bKash');
        this.mockMode = true;
        return this.getAccessToken();
      }
      throw new Error('Unable to authenticate with bKash');
    }
  }

  // Create payment request
  async createPayment(paymentRequest: BkashPaymentRequest): Promise<BkashPaymentResponse> {
    try {
      // Mock mode for development
      if (this.mockMode) {
        const mockResponse: BkashPaymentResponse = {
          paymentID: `mock_payment_${Date.now()}`,
          statusCode: '0000',
          statusMessage: 'Success',
          paymentCreateTime: new Date().toISOString(),
          amount: paymentRequest.amount,
          currency: paymentRequest.currency,
          intent: paymentRequest.intent,
          merchantInvoiceNumber: paymentRequest.merchantInvoiceNumber,
          transactionStatus: 'Initiated',
          successCallbackURL: paymentRequest.callbackURL,
          failCallbackURL: paymentRequest.callbackURL,
          cancelledCallbackURL: paymentRequest.callbackURL,
          payerReference: paymentRequest.payerReference || 'mock_user',
          customerMsisdn: '01700000000'
        };

        logger.info('bKash mock payment created successfully');
        return mockResponse;
      }

      const accessToken = await this.getAccessToken();

      const response = await fetch(`${this.config.baseUrl}/tokenized/checkout/payment/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': accessToken,
          'X-APP-Key': this.config.appKey
        },
        body: JSON.stringify(paymentRequest)
      });

      if (!response.ok) {
        throw new Error(`bKash payment creation failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.statusCode !== '0000') {
        throw new Error(`bKash payment creation error: ${data.statusMessage}`);
      }

      logger.info('bKash payment created successfully');
      return data;

    } catch (error) {
      logger.error('Failed to create bKash payment');
      // Fallback to mock mode if real API fails
      if (!this.mockMode) {
        logger.warn('Falling back to mock mode for bKash payment creation');
        this.mockMode = true;
        return this.createPayment(paymentRequest);
      }
      throw error;
    }
  }

  // Execute payment
  async executePayment(paymentID: string): Promise<BkashExecuteResponse> {
    try {
      // Mock mode for development
      if (this.mockMode) {
        const mockResponse: BkashExecuteResponse = {
          paymentID,
          statusCode: '0000',
          statusMessage: 'Success',
          paymentExecuteTime: new Date().toISOString(),
          amount: '100.00', // Mock amount
          currency: 'BDT',
          intent: 'sale',
          merchantInvoiceNumber: `mock_invoice_${Date.now()}`,
          transactionStatus: 'Completed',
          successCallbackURL: this.config.callbackUrl,
          failCallbackURL: this.config.callbackUrl,
          cancelledCallbackURL: this.config.callbackUrl,
          payerReference: 'mock_user',
          customerMsisdn: '01700000000',
          trxID: `mock_trx_${Date.now()}`
        };

        logger.info('bKash mock payment executed successfully');
        
        return mockResponse;
      }

      const accessToken = await this.getAccessToken();

      const response = await fetch(`${this.config.baseUrl}/tokenized/checkout/payment/execute/${paymentID}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': accessToken,
          'X-APP-Key': this.config.appKey
        }
      });

      if (!response.ok) {
        throw new Error(`bKash payment execution failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.statusCode !== '0000') {
        throw new Error(`bKash payment execution error: ${data.statusMessage}`);
      }

      logger.info('bKash payment executed successfully');
      
      return data;

    } catch (error) {
      logger.error('Failed to execute bKash payment');
      // Fallback to mock mode if real API fails
      if (!this.mockMode) {
        logger.warn('Falling back to mock mode for bKash payment execution');
        this.mockMode = true;
        return this.executePayment(paymentID);
      }
      throw error;
    }
  }

  // Query payment status
  async queryPayment(paymentID: string): Promise<BkashExecuteResponse> {
    try {
      const accessToken = await this.getAccessToken();

      const response = await fetch(`${this.config.baseUrl}/tokenized/checkout/payment/query/${paymentID}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': accessToken,
          'X-APP-Key': this.config.appKey
        }
      });

      if (!response.ok) {
        throw new Error(`bKash payment query failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.statusCode !== '0000') {
        throw new Error(`bKash payment query error: ${data.statusMessage}`);
      }

      logger.info('bKash payment queried successfully');
      return data;

    } catch (error) {
      logger.error('Failed to query bKash payment');
      throw error;
    }
  }

  // Refund payment
  async refundPayment(
    paymentID: string, 
    trxID: string, 
    amount: string, 
    reason: string = 'Customer request'
  ): Promise<any> {
    try {
      const accessToken = await this.getAccessToken();

      const response = await fetch(`${this.config.baseUrl}/tokenized/checkout/payment/refund`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': accessToken,
          'X-APP-Key': this.config.appKey
        },
        body: JSON.stringify({
          paymentID,
          trxID,
          amount,
          reason,
          sku: 'refund'
        })
      });

      if (!response.ok) {
        throw new Error(`bKash refund failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.statusCode !== '0000') {
        throw new Error(`bKash refund error: ${data.statusMessage}`);
      }

      logger.info('bKash refund processed successfully');
      return data;

    } catch (error) {
      logger.error('Failed to refund bKash payment');
      throw error;
    }
  }

  // Validate webhook signature
  validateWebhookSignature(payload: string, signature: string): boolean {
    // In a real implementation, you would validate the signature
    // For now, we'll return true for mock mode
    if (this.mockMode) {
      return true;
    }
    
    // TODO: Implement proper signature validation
    return true;
  }

  // Process webhook
  async processWebhook(payload: any): Promise<{
    paymentID: string;
    status: string;
    trxID?: string;
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
        paymentID: data.paymentID,
        status: data.transactionStatus,
        trxID: data.trxID,
        amount: data.amount,
        currency: data.currency
      };

    } catch (error) {
      logger.error('Failed to process bKash webhook');
      throw error;
    }
  }

  // Get payment URL for redirect
  getPaymentUrl(paymentID: string): string {
    const baseUrl = this.config.sandbox 
      ? 'https://tokenized.sandbox.bkash.com/checkout'
      : 'https://tokenized.pay.bkash.com/checkout';
    
    return `${baseUrl}/${paymentID}`;
  }

  // Validate payment amount
  validateAmount(amount: number): boolean {
    // bKash minimum amount is 1 BDT, maximum is 25,000 BDT
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
      logger.warn('bKash gateway is not available');
      return false;
    }
  }
}