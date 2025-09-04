import { getDb } from '../../core/db/mongoClient.js';
import { ObjectId } from 'mongodb';
import type { 
  PaymentTransaction, 
  RefundTransaction, 
  PaymentWebhook,
  PaymentStats,
  PaymentStatus,
  PaymentMethod 
} from './model.js';

const COLLECTIONS = {
  PAYMENTS: 'payments',
  REFUNDS: 'refunds',
  WEBHOOKS: 'payment_webhooks'
} as const;

export class PaymentRepository {
  private async getDb() {
    return await getDb();
  }

  // Payment Transaction Operations
  async createPayment(payment: Omit<PaymentTransaction, '_id' | 'createdAt' | 'updatedAt'>): Promise<PaymentTransaction> {
    const now = new Date().toISOString();
    const paymentData = {
      ...payment,
      createdAt: now,
      updatedAt: now
    };

    const db = await this.getDb();
    const result = await db.collection(COLLECTIONS.PAYMENTS).insertOne(paymentData);
    
    return {
      _id: result.insertedId.toString(),
      ...paymentData
    };
  }

  async getPaymentById(paymentId: string): Promise<PaymentTransaction | null> {
    const db = await this.getDb();
    const payment = await db.collection(COLLECTIONS.PAYMENTS).findOne({ _id: new ObjectId(paymentId) });
    return payment ? { ...payment, _id: payment._id.toString() } as PaymentTransaction : null;
  }

  async getPaymentByOrderId(orderId: string): Promise<PaymentTransaction | null> {
    const db = await this.getDb();
    const payment = await db.collection(COLLECTIONS.PAYMENTS).findOne({ orderId });
    return payment ? { ...payment, _id: payment._id.toString() } as PaymentTransaction : null;
  }

  async getPaymentByGatewayTransactionId(gatewayTransactionId: string): Promise<PaymentTransaction | null> {
    const db = await this.getDb();
    const payment = await db.collection(COLLECTIONS.PAYMENTS).findOne({ gatewayTransactionId });
    return payment ? { ...payment, _id: payment._id.toString() } as PaymentTransaction : null;
  }

  async updatePaymentStatus(
    paymentId: string, 
    status: PaymentStatus, 
    updates: Partial<PaymentTransaction> = {}
  ): Promise<PaymentTransaction | null> {
    const updateData = {
      ...updates,
      status,
      updatedAt: new Date().toISOString()
    };

    // Set completion timestamps based on status
    if (status === 'completed' && !updates.completedAt) {
      updateData.completedAt = new Date().toISOString();
    } else if (status === 'failed' && !updates.failedAt) {
      updateData.failedAt = new Date().toISOString();
    } else if (status === 'cancelled' && !updates.cancelledAt) {
      updateData.cancelledAt = new Date().toISOString();
    }

    const db = await this.getDb();
    const result = await db.collection(COLLECTIONS.PAYMENTS).findOneAndUpdate(
      { _id: new ObjectId(paymentId) },
      { $set: updateData },
      { returnDocument: 'after' }
    );

    return result ? { ...result, _id: result._id.toString() } as PaymentTransaction : null;
  }

  async updatePaymentGatewayData(
    paymentId: string, 
    gatewayData: Partial<PaymentTransaction>
  ): Promise<PaymentTransaction | null> {
    const updateData = {
      ...gatewayData,
      updatedAt: new Date().toISOString()
    };

    const db = await this.getDb();
    const result = await db.collection(COLLECTIONS.PAYMENTS).findOneAndUpdate(
      { _id: new ObjectId(paymentId) },
      { $set: updateData },
      { returnDocument: 'after' }
    );

    return result ? { ...result, _id: result._id.toString() } as PaymentTransaction : null;
  }

  async getUserPayments(userId: string, limit = 50, skip = 0): Promise<PaymentTransaction[]> {
    const db = await this.getDb();
    const payments = await db.collection(COLLECTIONS.PAYMENTS)
      .find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .toArray();

    return payments.map(payment => ({ ...payment, _id: payment._id.toString() } as PaymentTransaction));
  }

  async getPaymentsByStatus(status: PaymentStatus, limit = 100): Promise<PaymentTransaction[]> {
    const db = await this.getDb();
    const payments = await db.collection(COLLECTIONS.PAYMENTS)
      .find({ status })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    return payments.map(payment => ({ ...payment, _id: payment._id.toString() } as PaymentTransaction));
  }

  async getPendingPayments(olderThanMinutes = 30): Promise<PaymentTransaction[]> {
    const cutoffTime = new Date(Date.now() - olderThanMinutes * 60 * 1000).toISOString();
    
    const db = await this.getDb();
    const payments = await db.collection(COLLECTIONS.PAYMENTS)
      .find({ 
        status: 'pending',
        createdAt: { $lt: cutoffTime }
      })
      .sort({ createdAt: 1 })
      .toArray();

    return payments.map(payment => ({ ...payment, _id: payment._id.toString() } as PaymentTransaction));
  }

  // Refund Operations
  async createRefund(refund: Omit<RefundTransaction, '_id' | 'createdAt'>): Promise<RefundTransaction> {
    const now = new Date().toISOString();
    const refundData = {
      ...refund,
      createdAt: now
    };

    const db = await this.getDb();
    const result = await db.collection(COLLECTIONS.REFUNDS).insertOne(refundData);
    
    return {
      _id: result.insertedId.toString(),
      ...refundData
    };
  }

  async getRefundsByPaymentId(paymentTransactionId: string): Promise<RefundTransaction[]> {
    const db = await this.getDb();
    const refunds = await db.collection(COLLECTIONS.REFUNDS)
      .find({ paymentTransactionId })
      .sort({ createdAt: -1 })
      .toArray();

    return refunds.map(refund => ({ ...refund, _id: refund._id.toString() } as RefundTransaction));
  }

  async updateRefundStatus(
    refundId: string, 
    status: RefundTransaction['status'],
    gatewayData?: Partial<RefundTransaction>
  ): Promise<RefundTransaction | null> {
    const updateData = {
      ...gatewayData,
      status,
      ...(status === 'completed' && { processedAt: new Date().toISOString() })
    };

    const db = await this.getDb();
    const result = await db.collection(COLLECTIONS.REFUNDS).findOneAndUpdate(
      { _id: new ObjectId(refundId) },
      { $set: updateData },
      { returnDocument: 'after' }
    );

    return result ? { ...result, _id: result._id.toString() } as RefundTransaction : null;
  }

  // Webhook Operations
  async createWebhook(webhook: Omit<PaymentWebhook, '_id' | 'createdAt'>): Promise<PaymentWebhook> {
    const now = new Date().toISOString();
    const webhookData = {
      ...webhook,
      createdAt: now
    };

    const db = await this.getDb();
    const result = await db.collection(COLLECTIONS.WEBHOOKS).insertOne(webhookData);
    
    return {
      _id: result.insertedId.toString(),
      ...webhookData
    };
  }

  async getUnprocessedWebhooks(): Promise<PaymentWebhook[]> {
    const db = await this.getDb();
    const webhooks = await db.collection(COLLECTIONS.WEBHOOKS)
      .find({ processed: false })
      .sort({ createdAt: 1 })
      .toArray();

    return webhooks.map(webhook => ({ ...webhook, _id: webhook._id.toString() } as PaymentWebhook));
  }

  async markWebhookProcessed(webhookId: string): Promise<void> {
    const db = await this.getDb();
    await db.collection(COLLECTIONS.WEBHOOKS).updateOne(
      { _id: new ObjectId(webhookId) },
      { 
        $set: { 
          processed: true, 
          processedAt: new Date().toISOString() 
        } 
      }
    );
  }

  // Statistics and Analytics
  async getPaymentStats(startDate?: string, endDate?: string): Promise<PaymentStats> {
    const matchStage: any = {};
    
    if (startDate || endDate) {
      matchStage.createdAt = {};
      if (startDate) matchStage.createdAt.$gte = startDate;
      if (endDate) matchStage.createdAt.$lte = endDate;
    }

    const pipeline = [
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalTransactions: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
          successfulTransactions: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          successfulAmount: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$amount', 0] }
          },
          failedTransactions: {
            $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
          },
          failedAmount: {
            $sum: { $cond: [{ $eq: ['$status', 'failed'] }, '$amount', 0] }
          },
          pendingTransactions: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          },
          pendingAmount: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, '$amount', 0] }
          }
        }
      }
    ];

    const db = await this.getDb();
    const [stats] = await db.collection(COLLECTIONS.PAYMENTS).aggregate(pipeline).toArray();

    if (!stats) {
      return {
        totalTransactions: 0,
        successfulTransactions: 0,
        failedTransactions: 0,
        pendingTransactions: 0,
        totalAmount: 0,
        successfulAmount: 0,
        failedAmount: 0,
        pendingAmount: 0,
        averageTransactionAmount: 0,
        successRate: 0,
        methodBreakdown: {} as Record<PaymentMethod, any>
      };
    }

    const averageTransactionAmount = stats.totalTransactions > 0 
      ? stats.totalAmount / stats.totalTransactions 
      : 0;

    const successRate = stats.totalTransactions > 0 
      ? (stats.successfulTransactions / stats.totalTransactions) * 100 
      : 0;

    // Get method breakdown
    const methodPipeline = [
      { $match: matchStage },
      {
        $group: {
          _id: '$paymentMethod',
          count: { $sum: 1 },
          amount: { $sum: '$amount' },
          successfulCount: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          }
        }
      }
    ];

    const methodStats = await db.collection(COLLECTIONS.PAYMENTS).aggregate(methodPipeline).toArray();
    
    const methodBreakdown: Record<PaymentMethod, any> = {} as any;
    methodStats.forEach((stat: any) => {
      const method = stat._id as PaymentMethod;
      methodBreakdown[method] = {
        count: stat.count,
        amount: stat.amount,
        successRate: stat.count > 0 ? (stat.successfulCount / stat.count) * 100 : 0
      };
    });

    return {
      totalTransactions: stats.totalTransactions,
      successfulTransactions: stats.successfulTransactions,
      failedTransactions: stats.failedTransactions,
      pendingTransactions: stats.pendingTransactions,
      totalAmount: stats.totalAmount,
      successfulAmount: stats.successfulAmount,
      failedAmount: stats.failedAmount,
      pendingAmount: stats.pendingAmount,
      averageTransactionAmount,
      successRate,
      methodBreakdown
    };
  }

  // Cleanup operations
  async deleteOldWebhooks(olderThanDays = 30): Promise<number> {
    const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000).toISOString();
    
    const db = await this.getDb();
    const result = await db.collection(COLLECTIONS.WEBHOOKS).deleteMany({
      createdAt: { $lt: cutoffDate },
      processed: true
    });

    return result.deletedCount;
  }

  async deleteOldFailedPayments(olderThanDays = 90): Promise<number> {
    const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000).toISOString();
    
    const db = await this.getDb();
    const result = await db.collection(COLLECTIONS.PAYMENTS).deleteMany({
      status: 'failed',
      createdAt: { $lt: cutoffDate }
    });

    return result.deletedCount;
  }
}

export const paymentRepository = new PaymentRepository();