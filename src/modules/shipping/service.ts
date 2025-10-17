import { PathaoGateway } from './gateways/pathao.js';
import type { ICourierGateway } from './gateways/base.js';
import type {
  CourierService,
  CourierRate,
  CourierRateRequest,
  CreateShipmentRequest,
  Shipment,
  ShipmentStatus,
} from './model.js';
import * as shippingRepo from './repository.js';
import { logger } from '../../core/logging/logger.js';
import { env } from '../../config/env.js';

export class ShippingService {
  private gateways: Map<CourierService, ICourierGateway> = new Map();
  
  constructor() {
    this.initializeGateways();
  }
  
  /**
   * Initialize courier gateways based on environment configuration
   */
  private initializeGateways(): void {
    // Initialize Pathao
    if (env.pathaoClientId && env.pathaoClientSecret && env.pathaoStoreId) {
      const pathao = new PathaoGateway({
        clientId: env.pathaoClientId,
        clientSecret: env.pathaoClientSecret,
        storeId: env.pathaoStoreId,
        sandbox: env.pathaoSandbox === 'true',
      });
      this.gateways.set('pathao', pathao);
      logger.info('Pathao courier gateway initialized');
    } else {
      logger.warn('Pathao credentials not configured');
    }
    
    // TODO: Initialize Redx when credentials are available
    // TODO: Initialize Steadfast when credentials are available
  }
  
  /**
   * Get courier gateway
   */
  private getGateway(courier: CourierService): ICourierGateway {
    const gateway = this.gateways.get(courier);
    if (!gateway) {
      throw new Error(`Courier ${courier} is not configured or available`);
    }
    return gateway;
  }
  
  /**
   * Get delivery rates from all available couriers
   */
  async getRates(request: CourierRateRequest): Promise<CourierRate[]> {
    const rates: CourierRate[] = [];
    
    for (const [courier, gateway] of this.gateways.entries()) {
      try {
        const rate = await gateway.getRate(request);
        rates.push(rate);
    } catch (error) {
      logger.error(`Failed to get rate from ${courier}:`, error as any);
        rates.push({
          courier,
          deliveryFee: 0,
          totalCharge: 0,
          available: false,
        });
      }
    }
    
    return rates.sort((a, b) => a.totalCharge - b.totalCharge);
  }
  
  /**
   * Get rate from specific courier
   */
  async getRate(courier: CourierService, request: CourierRateRequest): Promise<CourierRate> {
    const gateway = this.getGateway(courier);
    return gateway.getRate(request);
  }
  
  /**
   * Create a new shipment
   */
  async createShipment(
    request: CreateShipmentRequest,
    createdBy: string
  ): Promise<Shipment> {
    try {
      const gateway = this.getGateway(request.courier);
      
      // Create shipment via courier API
      const shipment = await gateway.createShipment(request);
      
      // Set creator
      shipment.createdBy = createdBy;
      
      // Save to database
      const savedShipment = await shippingRepo.createShipment(shipment);
      
      logger.info(`Shipment created: ${savedShipment._id} for order ${request.orderId}`);
      return savedShipment;
    } catch (error) {
      logger.error('Failed to create shipment:', error as any);
      throw error;
    }
  }
  
  /**
   * Track shipment by tracking number
   */
  async trackShipment(trackingNumber: string): Promise<Shipment> {
    // Find shipment in database
    const shipment = await shippingRepo.findShipmentByTrackingNumber(trackingNumber);
    if (!shipment) {
      throw new Error('Shipment not found');
    }
    
    try {
      // Get latest tracking info from courier
      const gateway = this.getGateway(shipment.courier);
      const updated = await gateway.trackShipment(trackingNumber);
      
      // Update database
      if (shipment._id) {
        await shippingRepo.updateShipment(shipment._id, {
          status: updated.status,
          trackingHistory: updated.trackingHistory,
          courierResponse: updated.courierResponse,
        });
      }
      
      return {
        ...shipment,
        ...updated,
      };
    } catch (error) {
      logger.error('Failed to track shipment:', error as any);
      // Return cached data if API fails
      return shipment;
    }
  }
  
  /**
   * Update shipment status manually
   */
  async updateStatus(
    shipmentId: string,
    status: ShipmentStatus,
    message?: string
  ): Promise<Shipment | null> {
    return shippingRepo.updateShipmentStatus(shipmentId, status, message);
  }
  
  /**
   * Cancel shipment
   */
  async cancelShipment(shipmentId: string): Promise<boolean> {
    const shipment = await shippingRepo.findShipmentById(shipmentId);
    if (!shipment) {
      throw new Error('Shipment not found');
    }
    
    // Don't allow cancellation of delivered or cancelled shipments
    if (['delivered', 'cancelled', 'returned'].includes(shipment.status)) {
      throw new Error(`Cannot cancel shipment with status: ${shipment.status}`);
    }
    
    try {
      const gateway = this.getGateway(shipment.courier);
      const cancelled = await gateway.cancelShipment(shipment.trackingNumber!);
      
      if (cancelled) {
        await shippingRepo.updateShipmentStatus(
          shipmentId,
          'cancelled',
          'Shipment cancelled by admin'
        );
      }
      
      return cancelled;
    } catch (error) {
      logger.error('Failed to cancel shipment:', error as any);
      
      // Update status locally even if API fails
      await shippingRepo.updateShipmentStatus(
        shipmentId,
        'cancelled',
        'Shipment marked as cancelled (manual)'
      );
      
      return false;
    }
  }
  
  /**
   * Get shipment by ID
   */
  async getShipmentById(id: string): Promise<Shipment | null> {
    return shippingRepo.findShipmentById(id);
  }
  
  /**
   * Get shipment by order ID
   */
  async getShipmentByOrderId(orderId: string): Promise<Shipment | null> {
    return shippingRepo.findShipmentByOrderId(orderId);
  }
  
  /**
   * Get all shipments for an order
   */
  async getShipmentsByOrderId(orderId: string): Promise<Shipment[]> {
    return shippingRepo.findAllShipmentsByOrderId(orderId);
  }
  
  /**
   * List shipments with filters
   */
  async listShipments(filters: {
    status?: ShipmentStatus;
    courier?: CourierService;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }): Promise<{ shipments: Shipment[]; total: number; pages: number }> {
    const page = filters.page || 1;
    const limit = filters.limit || 50;
    const skip = (page - 1) * limit;
    
    const result = await shippingRepo.findShipments({
      ...filters,
      skip,
      limit,
    });
    
    return {
      shipments: result.shipments,
      total: result.total,
      pages: Math.ceil(result.total / limit),
    };
  }
  
  /**
   * Get shipment statistics
   */
  async getStats(filters?: {
    startDate?: string;
    endDate?: string;
    courier?: CourierService;
  }) {
    return shippingRepo.getShipmentStats(filters);
  }
  
  /**
   * Check if courier is available in area
   */
  async isAvailable(
    courier: CourierService,
    city: string,
    area: string
  ): Promise<boolean> {
    try {
      const gateway = this.getGateway(courier);
      return gateway.isAvailable(city, area);
        } catch (error) {
          logger.error(`Failed to check availability for ${courier}:`, error as any);
      return false;
    }
  }
  
  /**
   * Sync shipment status from courier API
   * This can be run periodically to update all active shipments
   */
  async syncShipmentStatuses(): Promise<void> {
    const activeStatuses: ShipmentStatus[] = [
      'requested',
      'pickup_pending',
      'pickup_completed',
      'in_transit',
      'out_for_delivery',
      ];
    
    for (const status of activeStatuses) {
      const { shipments } = await shippingRepo.findShipments({ status, limit: 100 });
      
      for (const shipment of shipments) {
        try {
          if (shipment.trackingNumber) {
            await this.trackShipment(shipment.trackingNumber);
          }
        } catch (error) {
          logger.error(`Failed to sync shipment ${shipment._id}:`, error as any);
        }
      }
    }
    
    logger.info('Shipment status sync completed');
  }
}

// Singleton instance
export const shippingService = new ShippingService();

