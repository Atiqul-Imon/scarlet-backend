import crypto from 'crypto';

export interface SSLCommerzConfig {
  storeId: string;
  storePassword: string;
  sandbox: boolean;
  successUrl: string;
  failUrl: string;
  cancelUrl: string;
  ipnUrl: string;
}

export interface SSLCommerzPaymentRequest {
  total_amount: number;
  currency: string;
  tran_id: string;
  success_url: string;
  fail_url: string;
  cancel_url: string;
  ipn_url: string;
  multi_card_name: string;
  allowed_bin: string;
  emi_option: number;
  emi_max_inst_option: number;
  emi_selected_inst: number;
  emi_allow_only: number;
  cus_name: string;
  cus_email: string;
  cus_add1: string;
  cus_add2?: string;
  cus_city: string;
  cus_state: string;
  cus_postcode: string;
  cus_country: string;
  cus_phone: string;
  cus_fax?: string;
  ship_name: string;
  ship_add1: string;
  ship_add2?: string;
  ship_city: string;
  ship_state: string;
  ship_postcode: string;
  ship_country: string;
  product_name: string;
  product_category: string;
  product_profile: string;
  hours_till_departure: string;
  flight_type: string;
  pnr: string;
  journey_from_to: string;
  third_party_booking: string;
  hotel_name: string;
  length_of_stay: string;
  check_in_time: string;
  checkout_time: string;
  hotel_city: string;
  product_type: string;
  topup_number: string;
  country_topup: string;
  cart: Array<{
    product: string;
    amount: number;
  }>;
  value_a: string;
  value_b: string;
  value_c: string;
  value_d: string;
}

export interface SSLCommerzPaymentResponse {
  status: 'SUCCESS' | 'FAILED' | 'CANCELLED';
  failedreason?: string;
  sessionkey?: string;
  gw?: {
    visa?: string;
    master?: string;
    amex?: string;
    othercards?: string;
    internetbanking?: string;
    mobilebanking?: string;
  };
  redirectGatewayURL?: string;
  directPayURL?: string;
  redirectURL?: string;
}

export interface SSLCommerzValidationResponse {
  status: 'VALID' | 'INVALID';
  tran_id: string;
  val_id: string;
  amount: number;
  store_amount: number;
  currency: string;
  bank_tran_id: string;
  card_type: string;
  card_no: string;
  card_issuer: string;
  card_brand: string;
  card_issuer_country: string;
  card_issuer_country_code: string;
  store_id: string;
  verify_sign: string;
  verify_key: string;
  risk_level: string;
  risk_title: string;
  value_a: string;
  value_b: string;
  value_c: string;
  value_d: string;
  val_id_upper: string;
  bank_gw: string;
  bank_tran_date: string;
  currency_type: string;
  currency_amount: string;
  currency_rate: string;
  base_fair: string;
  value_1: string;
  value_2: string;
  value_3: string;
  value_4: string;
}

export class SSLCommerzGateway {
  private config: SSLCommerzConfig;
  private baseUrl: string;

  constructor(config: SSLCommerzConfig) {
    this.config = config;
    this.baseUrl = config.sandbox 
      ? 'https://sandbox.sslcommerz.com/gwprocess/v4/api.php'
      : 'https://securepay.sslcommerz.com/gwprocess/v4/api.php';
  }

  /**
   * Generate payment session
   */
  async createPaymentSession(paymentData: Partial<SSLCommerzPaymentRequest>): Promise<SSLCommerzPaymentResponse> {
    const paymentRequest: SSLCommerzPaymentRequest = {
      total_amount: paymentData.total_amount || 0,
      currency: paymentData.currency || 'BDT',
      tran_id: paymentData.tran_id || this.generateTransactionId(),
      success_url: this.config.successUrl,
      fail_url: this.config.failUrl,
      cancel_url: this.config.cancelUrl,
      ipn_url: this.config.ipnUrl,
      multi_card_name: 'mastercard,visacard,amexcard',
      allowed_bin: '',
      emi_option: 0,
      emi_max_inst_option: 0,
      emi_selected_inst: 0,
      emi_allow_only: 0,
      cus_name: paymentData.cus_name || '',
      cus_email: paymentData.cus_email || '',
      cus_add1: paymentData.cus_add1 || '',
      cus_add2: paymentData.cus_add2 || '',
      cus_city: paymentData.cus_city || '',
      cus_state: paymentData.cus_state || '',
      cus_postcode: paymentData.cus_postcode || '',
      cus_country: paymentData.cus_country || 'Bangladesh',
      cus_phone: paymentData.cus_phone || '',
      cus_fax: paymentData.cus_fax || '',
      ship_name: paymentData.ship_name || paymentData.cus_name || '',
      ship_add1: paymentData.ship_add1 || paymentData.cus_add1 || '',
      ship_add2: paymentData.ship_add2 || paymentData.cus_add2 || '',
      ship_city: paymentData.ship_city || paymentData.cus_city || '',
      ship_state: paymentData.ship_state || paymentData.cus_state || '',
      ship_postcode: paymentData.ship_postcode || paymentData.cus_postcode || '',
      ship_country: paymentData.ship_country || paymentData.cus_country || 'Bangladesh',
      product_name: paymentData.product_name || 'Scarlet Beauty Products',
      product_category: paymentData.product_category || 'Beauty & Skincare',
      product_profile: paymentData.product_profile || 'general',
      hours_till_departure: '',
      flight_type: '',
      pnr: '',
      journey_from_to: '',
      third_party_booking: '',
      hotel_name: '',
      length_of_stay: '',
      check_in_time: '',
      checkout_time: '',
      hotel_city: '',
      product_type: '',
      topup_number: '',
      country_topup: '',
      cart: paymentData.cart || [],
      value_a: paymentData.value_a || '',
      value_b: paymentData.value_b || '',
      value_c: paymentData.value_c || '',
      value_d: paymentData.value_d || '',
      ...paymentData
    };

    // Generate hash for authentication
    const hashString = `${this.config.storeId}${paymentRequest.tran_id}${paymentRequest.total_amount}${this.config.storePassword}`;
    const hash = crypto.createHash('sha512').update(hashString).digest('hex');

    const requestData = {
      ...paymentRequest,
      store_id: this.config.storeId,
      store_passwd: this.config.storePassword,
      hash: hash
    };

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(requestData as any).toString()
      });

      const result = await response.json();
      return result as SSLCommerzPaymentResponse;
    } catch (error) {
      console.error('SSL Commerz payment session creation failed:', error);
      throw new Error('Failed to create payment session');
    }
  }

  /**
   * Validate payment response
   */
  async validatePayment(valId: string, amount: number, currency: string): Promise<SSLCommerzValidationResponse> {
    const validationUrl = this.config.sandbox
      ? 'https://sandbox.sslcommerz.com/validator/api/validationserverAPI.php'
      : 'https://securepay.sslcommerz.com/validator/api/validationserverAPI.php';

    const requestData = {
      val_id: valId,
      store_id: this.config.storeId,
      store_passwd: this.config.storePassword,
      format: 'json'
    };

    try {
      const response = await fetch(validationUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(requestData).toString()
      });

      const result = await response.json();
      return result as SSLCommerzValidationResponse;
    } catch (error) {
      console.error('SSL Commerz payment validation failed:', error);
      throw new Error('Failed to validate payment');
    }
  }

  /**
   * Generate transaction ID
   */
  private generateTransactionId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `SSL_${timestamp}_${random}`.toUpperCase();
  }

  /**
   * Verify hash signature
   */
  verifyHash(data: any, hash: string): boolean {
    const { store_id, tran_id, amount, currency, status, val_id, store_amount, cus_fax, cus_email, cus_name, basket_id } = data;
    
    const hashString = `${this.config.storeId}${val_id}${this.config.storePassword}${tran_id}${amount}${currency}`;
    const calculatedHash = crypto.createHash('sha512').update(hashString).digest('hex');
    
    return calculatedHash === hash;
  }

  /**
   * Get payment methods
   */
  getPaymentMethods(): string[] {
    return [
      'bKash',
      'Nagad',
      'Rocket',
      'Visa',
      'Mastercard',
      'American Express',
      'Mobile Banking',
      'Internet Banking',
      'Bank Transfer'
    ];
  }

  /**
   * Get gateway URL for redirect
   */
  getGatewayUrl(sessionKey: string): string {
    return this.config.sandbox
      ? `https://sandbox.sslcommerz.com/gwprocess/v4/gw.php?sessionkey=${sessionKey}`
      : `https://securepay.sslcommerz.com/gwprocess/v4/gw.php?sessionkey=${sessionKey}`;
  }
}
