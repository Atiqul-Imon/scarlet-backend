import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../core/logging/logger.js';
import { paymentRepository } from './repository.js';
import { BkashGateway } from './gateways/bkash.js';
import { NagadGateway } from './gateways/nagad.js';
import type {
  PaymentTransaction,
  CreatePaymentRequest,
  CreatePaymentResponse,
  PaymentVerificationRequest,
  PaymentVerificationResponse,
  PaymentConfig,
  PaymentMethod,
  PaymentStatus,
  RefundTransaction,
  BkashPaymentResponse,
  NagadPaymentResponse,
  BkashExecuteResponse,
  NagadVerifyResponse,
  PaymentStats
} from './model.js';

export class PaymentService {
  private bkashGateway: BkashGateway;
  private nagadGateway: NagadGateway;
  private config: PaymentConfig;

  constructor(config: PaymentConfig) {
    this.config = config;
    this.bkashGateway = new BkashGateway(config.bkash);
    this.nagadGateway = new NagadGateway(config.nagad);
  }

  // Create payment
  async createPayment(request: CreatePaymentRequest): Promise<CreatePaymentResponse> {
    try {
      // Validate payment method
      if (!this.isValidPaymentMethod(request.paymentMethod)) {
        throw new Error(`Unsupported payment method: ${request.paymentMethod}`);
      }

      // Validate amount
      if (!this.validateAmount(request.amount)) {
        throw new Error('Invalid payment amount');
      }

      // Create payment transaction record
      const paymentTransaction: Omit<PaymentTransaction, '_id' | 'createdAt' | 'updatedAt'> = {
        orderId: request.orderId,
        userId: '', // Will be set by the caller
        paymentMethod: request.paymentMethod,
        gateway: this.getGatewayForMethod(request.paymentMethod) as 'bkash' | 'nagad' | 'rocket' | 'stripe' | 'manual',
        amount: request.amount,
        currency: request.currency,
        status: 'pending',
        metadata: request.metadata
      };

      const savedPayment = await paymentRepository.createPayment(paymentTransaction);

      // Create payment with gateway
      let gatewayResponse: BkashPaymentResponse | NagadPaymentResponse | Record<string, unknown> = {};
      let gatewayUrl: string | undefined;

      switch (request.paymentMethod) {
        case 'bkash':
          const bkashRequest = {
            amount: request.amount.toString(),
            currency: request.currency,
            intent: 'sale',
            merchantInvoiceNumber: `ORDER_${request.orderId}`,
            callbackURL: request.returnUrl,
            payerReference: `USER_${savedPayment.userId}`
          };

          const bkashResponse = await this.bkashGateway.createPayment(bkashRequest);
          gatewayResponse = bkashResponse;
          gatewayUrl = this.bkashGateway.getPaymentUrl(bkashResponse.paymentID);
          
          // Update payment with gateway data
          await paymentRepository.updatePaymentGatewayData(savedPayment._id!, {
            gatewayTransactionId: bkashResponse.paymentID,
            gatewayResponse: bkashResponse
          });
          break;

        case 'nagad':
          const nagadRequest = {
            amount: request.amount.toString(),
            currency: request.currency,
            orderId: request.orderId,
            callbackUrl: request.returnUrl
          };

          const nagadResponse = await this.nagadGateway.createPayment(nagadRequest);
          gatewayResponse = nagadResponse;
          gatewayUrl = this.nagadGateway.getPaymentUrl(nagadResponse.paymentRefId);
          
          // Update payment with gateway data
          await paymentRepository.updatePaymentGatewayData(savedPayment._id!, {
            gatewayTransactionId: nagadResponse.paymentRefId,
            gatewayResponse: nagadResponse
          });
          break;

        case 'cod':
          // Cash on Delivery - no gateway interaction needed
          await paymentRepository.updatePaymentStatus(savedPayment._id!, 'completed', {
            paymentDate: new Date().toISOString()
          });
          break;

        default:
          throw new Error(`Payment method ${request.paymentMethod} not implemented`);
      }

      const response: CreatePaymentResponse = {
        paymentId: savedPayment._id!,
        status: savedPayment.status,
        gatewayUrl,
        gatewayData: gatewayResponse,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 minutes
      };

      logger.info('Payment created successfully');

      return response;

    } catch (error) {
      logger.error('Failed to create payment');
      throw error;
    }
  }

  // Verify payment
  async verifyPayment(request: PaymentVerificationRequest): Promise<PaymentVerificationResponse> {
    try {
      const payment = await paymentRepository.getPaymentById(request.paymentId);
      
      if (!payment) {
        throw new Error('Payment not found');
      }

      if (payment.status === 'completed') {
        return {
          paymentId: payment._id!,
          status: payment.status,
          transactionId: payment.gatewayTransactionId,
          amount: payment.amount,
          currency: payment.currency,
          paymentDate: payment.paymentDate,
          gatewayResponse: payment.gatewayResponse
        };
      }

      let verificationResult: BkashExecuteResponse | NagadVerifyResponse | Record<string, unknown> = {};
      let newStatus: PaymentStatus = 'failed';

      switch (payment.paymentMethod) {
        case 'bkash':
          if (!payment.gatewayTransactionId) {
            throw new Error('bKash payment ID not found');
          }
          
          const bkashExecuteResult = await this.bkashGateway.executePayment(payment.gatewayTransactionId);
          verificationResult = bkashExecuteResult;
          
          if (bkashExecuteResult.transactionStatus === 'Completed') {
            newStatus = 'completed';
          } else if (bkashExecuteResult.transactionStatus === 'Failed') {
            newStatus = 'failed';
          } else {
            newStatus = 'processing';
          }
          break;

        case 'nagad':
          if (!payment.gatewayTransactionId) {
            throw new Error('Nagad payment reference not found');
          }
          
          const nagadVerifyResult = await this.nagadGateway.verifyPayment(
            payment.gatewayTransactionId, 
            payment.orderId
          );
          verificationResult = nagadVerifyResult;
          
          if (nagadVerifyResult.status === 'Success') {
            newStatus = 'completed';
          } else {
            newStatus = 'failed';
          }
          break;

        case 'cod':
          newStatus = 'completed';
          break;

        default:
          throw new Error(`Payment verification not supported for method: ${payment.paymentMethod}`);
      }

      // Update payment status
      const updatedPayment = await paymentRepository.updatePaymentStatus(
        payment._id!, 
        newStatus, 
        {
          gatewayResponse: verificationResult,
          paymentDate: newStatus === 'completed' ? new Date().toISOString() : undefined
        }
      );

      const response: PaymentVerificationResponse = {
        paymentId: payment._id!,
        status: newStatus,
        transactionId: updatedPayment?.gatewayTransactionId,
        amount: payment.amount,
        currency: payment.currency,
        paymentDate: updatedPayment?.paymentDate,
        gatewayResponse: verificationResult
      };

      logger.info('Payment verified successfully');

      return response;

    } catch (error) {
      logger.error('Failed to verify payment');
      throw error;
    }
  }

  // Process webhook
  async processWebhook(gateway: string, payload: Record<string, unknown>, signature?: string): Promise<void> {
    try {
      // Create webhook record
      const webhook = await paymentRepository.createWebhook({
        transactionId: (payload.paymentID as string) || (payload.paymentRefId as string) || 'unknown',
        gateway: gateway as 'bkash' | 'nagad' | 'rocket' | 'stripe' | 'manual',
        eventType: (payload.eventType as string) || 'payment_update',
        payload,
        signature,
        processed: false
      });

      let webhookData: Record<string, unknown>;

      switch (gateway) {
        case 'bkash':
          webhookData = await this.bkashGateway.processWebhook(payload);
          break;
        case 'nagad':
          webhookData = await this.nagadGateway.processWebhook(payload);
          break;
        default:
          throw new Error(`Unsupported webhook gateway: ${gateway}`);
      }

      // Find payment by gateway transaction ID
      const payment = await paymentRepository.getPaymentByGatewayTransactionId(
        (webhookData.paymentID as string) || (webhookData.paymentRefId as string)
      );

      if (!payment) {
        logger.warn('Payment not found for webhook');
        return;
      }

      // Update payment status based on webhook
      let newStatus: PaymentStatus = 'pending';
      
      if (webhookData.status === 'Completed' || webhookData.status === 'Success') {
        newStatus = 'completed';
      } else if (webhookData.status === 'Failed' || webhookData.status === 'Failed') {
        newStatus = 'failed';
      } else if (webhookData.status === 'Cancelled') {
        newStatus = 'cancelled';
      }

      await paymentRepository.updatePaymentStatus(payment._id!, newStatus, {
        gatewayResponse: webhookData,
        paymentDate: newStatus === 'completed' ? new Date().toISOString() : undefined
      });

      // Mark webhook as processed
      await paymentRepository.markWebhookProcessed(webhook._id!);

      logger.info('Webhook processed successfully');

    } catch (error) {
      logger.error('Failed to process webhook');
      throw error;
    }
  }

  // Refund payment
  async refundPayment(
    paymentId: string, 
    amount: number, 
    reason: string = 'Customer request'
  ): Promise<RefundTransaction> {
    try {
      const payment = await paymentRepository.getPaymentById(paymentId);
      
      if (!payment) {
        throw new Error('Payment not found');
      }

      if (payment.status !== 'completed') {
        throw new Error('Only completed payments can be refunded');
      }

      if (amount > payment.amount) {
        throw new Error('Refund amount cannot exceed payment amount');
      }

      // Check if already refunded
      const existingRefunds = await paymentRepository.getRefundsByPaymentId(paymentId);
      const totalRefunded = existingRefunds
        .filter(r => r.status === 'completed')
        .reduce((sum, r) => sum + r.amount, 0);

      if (totalRefunded + amount > payment.amount) {
        throw new Error('Total refund amount cannot exceed payment amount');
      }

      // Create refund record
      const refund: Omit<RefundTransaction, '_id' | 'createdAt'> = {
        paymentTransactionId: paymentId,
        refundId: uuidv4(),
        amount,
        reason,
        status: 'pending'
      };

      const savedRefund = await paymentRepository.createRefund(refund);

      // Process refund with gateway
      let refundResult: Record<string, unknown> = {};

      switch (payment.paymentMethod) {
        case 'bkash':
          if (!payment.gatewayTransactionId) {
            throw new Error('bKash transaction ID not found');
          }
          
          refundResult = await this.bkashGateway.refundPayment(
            payment.gatewayTransactionId,
            payment.gatewayResponse?.trxID || '',
            amount.toString(),
            reason
          );
          break;

        case 'nagad':
          if (!payment.gatewayTransactionId) {
            throw new Error('Nagad payment reference not found');
          }
          
          refundResult = await this.nagadGateway.refundPayment(
            payment.gatewayTransactionId,
            payment.orderId,
            amount.toString(),
            reason
          );
          break;

        case 'cod':
          // Manual refund for COD
          refundResult = { status: 'Success', refundId: savedRefund.refundId };
          break;

        default:
          throw new Error(`Refund not supported for payment method: ${payment.paymentMethod}`);
      }

      // Update refund status
      const newRefundStatus = (refundResult.status as string) === 'Success' ? 'completed' : 'failed';
      const updatedRefund = await paymentRepository.updateRefundStatus(
        savedRefund._id!,
        newRefundStatus,
        {
          gatewayRefundId: (refundResult.refundId as string) || (refundResult.refundTrxID as string),
          gatewayResponse: refundResult
        }
      );

      // Update payment refunded amount
      const newRefundedAmount = (payment.refundedAmount || 0) + amount;
      const paymentStatus = newRefundedAmount >= payment.amount ? 'refunded' : 'partially_refunded';
      
      await paymentRepository.updatePaymentStatus(payment._id!, paymentStatus, {
        refundedAmount: newRefundedAmount
      });

      logger.info('Refund processed successfully');

      return updatedRefund!;

    } catch (error) {
      logger.error('Failed to process refund');
      throw error;
    }
  }

  // Get payment by ID
  async getPayment(paymentId: string): Promise<PaymentTransaction | null> {
    return await paymentRepository.getPaymentById(paymentId);
  }

  // Get payments by order ID
  async getPaymentsByOrderId(orderId: string): Promise<PaymentTransaction[]> {
    const payment = await paymentRepository.getPaymentByOrderId(orderId);
    return payment ? [payment] : [];
  }

  // Get user payments
  async getUserPayments(userId: string, limit = 50, skip = 0): Promise<PaymentTransaction[]> {
    return await paymentRepository.getUserPayments(userId, limit, skip);
  }

  // Get payment statistics
  async getPaymentStats(startDate?: string, endDate?: string): Promise<PaymentStats> {
    return await paymentRepository.getPaymentStats(startDate, endDate);
  }

  // Cleanup old data
  async cleanupOldData(): Promise<void> {
    try {
      const deletedWebhooks = await paymentRepository.deleteOldWebhooks(30);
      const deletedPayments = await paymentRepository.deleteOldFailedPayments(90);
      
      logger.info('Payment data cleanup completed');
    } catch (error) {
      logger.error('Failed to cleanup payment data');
      throw error;
    }
  }

  // Private helper methods
  private isValidPaymentMethod(method: string): method is PaymentMethod {
    return ['bkash', 'nagad', 'rocket', 'card', 'cod'].includes(method);
  }

  private validateAmount(amount: number): boolean {
    return amount > 0 && amount <= 100000; // Max 1 lakh BDT
  }

  private getGatewayForMethod(method: PaymentMethod): string {
    switch (method) {
      case 'bkash':
        return 'bkash';
      case 'nagad':
        return 'nagad';
      case 'rocket':
        return 'rocket';
      case 'card':
        return 'stripe';
      case 'cod':
        return 'manual';
      default:
        return 'manual';
    }
  }
}
