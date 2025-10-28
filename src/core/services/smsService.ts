/**
 * SSLWireless SMS Service Integration
 * https://docs.sslwireless.com/sms/sms-api/
 */

import axios, { type AxiosRequestConfig } from 'axios';
import { env } from '../../config/env.js';
import { logger } from '../logging/logger.js';
import { getSMSMessage, getSMSCharacterCount, isSingleSMS } from './bilingualSMS.js';

interface SSLWirelessSMSConfig {
  apiToken: string;
  sid: string;
  csmsId?: string;
}

interface SSLWirelessResponse {
  status: string;
  status_code: number;
  error_message?: string;
  smslog_id?: string;
}

interface SMSOptions {
  masking?: string; // Optional masking (brand name or phone number)
  csmsId?: string; // Client transaction ID
}

/**
 * SSLWireless SMS Service Class
 * 
 * API Documentation: https://docs.sslwireless.com/sms/sms-api/
 */
class SSLWirelessSMSService {
  private apiUrl = 'https://smsplus.sslwireless.com/api/v3/send-sms';
  private apiToken: string;
  private sid: string;

  constructor() {
    // Get credentials from environment variables
    this.apiToken = env.sslWirelessApiToken || '';
    this.sid = env.sslWirelessSid || '';

    if (!this.apiToken || !this.sid) {
      logger.warn('SSLWireless SMS credentials not configured. SMS sending will be disabled.');
    }
  }

  /**
   * Send SMS via SSLWireless API
   * 
   * @param phone - Recipient phone number (must be in 8801XXXXXXXXX format)
   * @param message - SMS message content
   * @param options - Optional configuration (masking, csmsId)
   * @returns Promise<string> - SMS log ID if successful
   */
  async sendSMS(
    phone: string,
    message: string,
    options: SMSOptions = {}
  ): Promise<string> {
    try {
      // Validate credentials
      if (!this.apiToken || !this.sid) {
        throw new Error('SSLWireless credentials not configured');
      }

      // Normalize phone number
      const normalizedPhone = this.normalizePhone(phone);
      if (!this.validatePhone(normalizedPhone)) {
        throw new Error(`Invalid phone number format: ${phone}`);
      }

      // Prepare request payload according to SSLWireless API v3 spec
      const payload = {
        api_token: this.apiToken,  // Provided by SSL for authentication (max 50 chars)
        sid: options.masking || this.sid,  // Masking name (max 20 chars)
        msisdn: normalizedPhone,  // Phone number in 8801XXXXXXXXX format
        sms: message,  // SMS body (max 1000 chars for English)
        csms_id: options.csmsId || this.generateCSMSId()  // Unique client reference ID (max 20 chars)
      };

      // Log SMS request
      logger.info({
        phone: normalizedPhone,
        messageLength: message.length,
        masking: options.masking,
        hasApiToken: !!this.apiToken,
        hasSid: !!this.sid
      }, 'Sending SMS via SSLWireless');

      // Make API request
      const config: AxiosRequestConfig = {
        method: 'POST',
        url: this.apiUrl,
        data: payload,
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000 // 30 seconds timeout
      };

      const response = await axios<SSLWirelessResponse>(config);

      // Check response
      if (response.data.status_code === 200) {
        logger.info({
          phone: normalizedPhone,
          smslogId: response.data.smslog_id
        }, 'SMS sent successfully via SSLWireless');

        return response.data.smslog_id || 'SUCCESS';
      } else {
        throw new Error(
          response.data.error_message || 
          `SSLWireless API returned status code: ${response.data.status_code}`
        );
      }

    } catch (error: any) {
      // Log error but don't fail the entire operation
      logger.error({
        error: error.message,
        phone,
        message,
        stack: error.stack
      }, 'Failed to send SMS via SSLWireless');

      // In development, log to console
      if (env.nodeEnv === 'development') {
        console.log(`\n📱 SMS NOT SENT (SSLWireless Error):`);
        console.log(`To: ${phone}`);
        console.log(`Message: ${message}`);
        console.log(`Error: ${error.message}\n`);
      }

      throw error;
    }
  }

  /**
   * Send OTP SMS with bilingual masking
   * 
   * @param phone - Recipient phone number
   * @param otp - 4-digit OTP code
   * @param purpose - OTP purpose (login, verification, passwordReset)
   * @returns Promise<string>
   */
  async sendOTP(phone: string, otp: string, purpose: 'login' | 'verification' | 'passwordReset' = 'verification'): Promise<string> {
    const message = getSMSMessage('otp', purpose, { otp });
    
    // Log character count for optimization
    logger.info({
      phone,
      otp,
      messageLength: getSMSCharacterCount(message),
      isSingleSMS: isSingleSMS(message),
      purpose
    }, 'Sending bilingual OTP SMS');
    
    return this.sendSMS(phone, message, {
      masking: 'Scarlet', // Your masking name from SSLWireless
      csmsId: `OTP_${purpose}_${Date.now()}`
    });
  }

  /**
   * Send order confirmation SMS with bilingual message
   * 
   * @param phone - Recipient phone number
   * @param orderNumber - Order number
   * @param total - Order total
   * @returns Promise<string>
   */
  async sendOrderConfirmation(
    phone: string,
    orderNumber: string,
    total: number
  ): Promise<string> {
    const message = getSMSMessage('order', 'confirmation', { 
      orderNumber, 
      total: total.toFixed(0) 
    });
    
    logger.info({
      phone,
      orderNumber,
      total,
      messageLength: getSMSCharacterCount(message),
      isSingleSMS: isSingleSMS(message)
    }, 'Sending bilingual order confirmation SMS');
    
    return this.sendSMS(phone, message, {
      masking: 'Scarlet',
      csmsId: `ORDER_${orderNumber}_${Date.now()}`
    });
  }

  /**
   * Send order status update SMS with bilingual message
   * 
   * @param phone - Recipient phone number
   * @param orderNumber - Order number
   * @param status - Order status (shipped, delivered, cancelled)
   * @returns Promise<string>
   */
  async sendOrderStatusUpdate(
    phone: string,
    orderNumber: string,
    status: 'shipped' | 'delivered' | 'cancelled'
  ): Promise<string> {
    const message = getSMSMessage('order', status, { orderNumber });
    
    logger.info({
      phone,
      orderNumber,
      status,
      messageLength: getSMSCharacterCount(message),
      isSingleSMS: isSingleSMS(message)
    }, 'Sending bilingual order status SMS');
    
    return this.sendSMS(phone, message, {
      masking: 'Scarlet',
      csmsId: `STATUS_${orderNumber}_${Date.now()}`
    });
  }

  /**
   * Send custom SMS notification
   * 
   * @param phone - Recipient phone number
   * @param customMessage - Custom message content
   * @param options - Optional configuration
   * @returns Promise<string>
   */
  async sendCustomNotification(
    phone: string,
    customMessage: string,
    options: SMSOptions = {}
  ): Promise<string> {
    return this.sendSMS(phone, customMessage, {
      ...options,
      masking: options.masking || 'Scarlet'
    });
  }

  /**
   * Send welcome SMS (bilingual)
   * 
   * @param phone - Recipient phone number
   * @param userType - newUser or returningUser
   * @returns Promise<string>
   */
  async sendWelcomeSMS(
    phone: string,
    userType: 'newUser' | 'returningUser' = 'newUser'
  ): Promise<string> {
    const message = getSMSMessage('welcome', userType);
    
    logger.info({
      phone,
      userType,
      messageLength: getSMSCharacterCount(message),
      isSingleSMS: isSingleSMS(message)
    }, 'Sending bilingual welcome SMS');
    
    return this.sendSMS(phone, message, {
      masking: 'Scarlet',
      csmsId: `WELCOME_${userType}_${Date.now()}`
    });
  }

  /**
   * Send promotional SMS (bilingual)
   * 
   * @param phone - Recipient phone number
   * @param promoType - discount, newProduct, or sale
   * @param data - Promotional data (discount percentage, etc.)
   * @returns Promise<string>
   */
  async sendPromotionalSMS(
    phone: string,
    promoType: 'discount' | 'newProduct' | 'sale',
    data: any = {}
  ): Promise<string> {
    const message = getSMSMessage('promotion', promoType, data);
    
    logger.info({
      phone,
      promoType,
      data,
      messageLength: getSMSCharacterCount(message),
      isSingleSMS: isSingleSMS(message)
    }, 'Sending bilingual promotional SMS');
    
    return this.sendSMS(phone, message, {
      masking: 'Scarlet',
      csmsId: `PROMO_${promoType}_${Date.now()}`
    });
  }

  /**
   * Send reminder SMS (bilingual)
   * 
   * @param phone - Recipient phone number
   * @param reminderType - cartAbandonment, wishlist, or review
   * @param data - Reminder data
   * @returns Promise<string>
   */
  async sendReminderSMS(
    phone: string,
    reminderType: 'cartAbandonment' | 'wishlist' | 'review',
    data: any = {}
  ): Promise<string> {
    const message = getSMSMessage('reminder', reminderType, data);
    
    logger.info({
      phone,
      reminderType,
      data,
      messageLength: getSMSCharacterCount(message),
      isSingleSMS: isSingleSMS(message)
    }, 'Sending bilingual reminder SMS');
    
    return this.sendSMS(phone, message, {
      masking: 'Scarlet',
      csmsId: `REMINDER_${reminderType}_${Date.now()}`
    });
  }

  /**
   * Normalize phone number to 8801XXXXXXXXX format
   */
  private normalizePhone(phone: string): string {
    // Remove spaces, dashes, and other characters
    let cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
    
    // Add + if not present
    if (!cleanPhone.startsWith('+') && !cleanPhone.startsWith('88')) {
      cleanPhone = '+88' + cleanPhone;
    }
    
    // Convert to 8801XXXXXXXXX format
    if (cleanPhone.startsWith('+8801')) {
      return cleanPhone.substring(1); // Remove +
    }
    
    if (cleanPhone.startsWith('8801')) {
      return cleanPhone;
    }
    
    if (cleanPhone.startsWith('01')) {
      return '88' + cleanPhone;
    }
    
    return cleanPhone;
  }

  /**
   * Validate Bangladesh phone number
   */
  private validatePhone(phone: string): boolean {
    // Should be 13 digits starting with 8801
    const pattern = /^8801[3-9]\d{8}$/;
    return pattern.test(phone);
  }

  /**
   * Generate unique CSMS ID
   */
  private generateCSMSId(): string {
    return `SCARLET_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Check if service is configured
   */
  isConfigured(): boolean {
    return !!(this.apiToken && this.sid);
  }
}

// Export singleton instance
export const smsService = new SSLWirelessSMSService();

// Export for testing
export default SSLWirelessSMSService;
