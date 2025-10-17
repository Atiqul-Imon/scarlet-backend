import { BaseCourierGateway } from './base.js';
import type {
  CourierRate,
  CourierRateRequest,
  CreateShipmentRequest,
  Shipment,
  ShipmentStatus,
  PathaoOrderRequest,
  PathaoOrderResponse,
  PathaoTrackingResponse,
  PathaoCity,
  PathaoZone,
  PathaoArea,
  PathaoStore
} from '../model.js';
import { logger } from '../../../core/logging/logger.js';

/**
 * Pathao Courier Integration
 * API Documentation: https://merchant.pathao.com/courier/docs
 */
export class PathaoGateway extends BaseCourierGateway {
  private accessToken?: string;
  private tokenExpiry?: number;
  private storeIdNumber: number;
  
  constructor(config: {
    clientId: string;
    clientSecret: string;
    storeId: string;
    sandbox?: boolean;
  }) {
    const baseUrl = config.sandbox
      ? 'https://courier-api-sandbox.pathao.com/api/v1'
      : 'https://courier-api.pathao.com/api/v1';
    
    super({
      apiKey: config.clientId,
      apiSecret: config.clientSecret,
      baseUrl,
      storeId: config.storeId,
      sandbox: config.sandbox || false,
    });
    
    this.storeIdNumber = parseInt(config.storeId, 10);
  }
  
  /**
   * Get or refresh access token
   */
  private async getAccessToken(): Promise<string> {
    // Return cached token if still valid
    if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.accessToken as string;
    }
    
    try {
      const response = await fetch(`${this.baseUrl}/issue-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          client_id: this.apiKey,
          client_secret: this.apiSecret,
          username: this.apiKey,    // Pathao uses client_id as username
          password: this.apiSecret,  // Pathao uses client_secret as password
          grant_type: 'password',
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Pathao Auth Error: ${response.status}`);
      }
      
      const data = await response.json();
      
      this.accessToken = data.access_token;
      // Set token expiry to 55 minutes (tokens are valid for 1 hour)
      this.tokenExpiry = Date.now() + (55 * 60 * 1000);
      
      logger.info('Pathao access token obtained successfully');
      return this.accessToken as string;
    } catch (error) {
      logger.error('Failed to get Pathao access token:', error as any);
      throw error;
    }
  }
  
  /**
   * Make authenticated request to Pathao API
   */
  protected async makeAuthRequest(
    method: string,
    endpoint: string,
    data?: any
  ): Promise<any> {
    const token = await this.getAccessToken();
    
    return this.makeRequest(method, endpoint, data, {
      'Authorization': `Bearer ${token}`,
    });
  }
  
  /**
   * Get list of cities
   */
  async getCities(): Promise<PathaoCity[]> {
    try {
      const response = await this.makeAuthRequest('GET', '/cities');
      return response.data.data || [];
    } catch (error) {
      logger.error('Failed to get Pathao cities:', error as any);
      return [];
    }
  }
  
  /**
   * Get zones by city ID
   */
  async getZones(cityId: number): Promise<PathaoZone[]> {
    try {
      const response = await this.makeAuthRequest('GET', `/cities/${cityId}/zone-list`);
      return response.data.data || [];
    } catch (error) {
      logger.error('Failed to get Pathao zones:', error as any);
      return [];
    }
  }
  
  /**
   * Get areas by zone ID
   */
  async getAreas(zoneId: number): Promise<PathaoArea[]> {
    try {
      const response = await this.makeAuthRequest('GET', `/zones/${zoneId}/area-list`);
      return response.data.data || [];
    } catch (error) {
      logger.error('Failed to get Pathao areas:', error as any);
      return [];
    }
  }
  
  /**
   * Get store information
   */
  async getStoreInfo(): Promise<PathaoStore | null> {
    try {
      const response = await this.makeAuthRequest('GET', '/stores');
      const stores = response.data.data || [];
      return stores.find((s: PathaoStore) => s.store_id === this.storeIdNumber) || stores[0] || null;
    } catch (error) {
      logger.error('Failed to get Pathao store info:', error as any);
      return null;
    }
  }
  
  /**
   * Find city ID by name
   */
  private async findCityId(cityName: string): Promise<number | null> {
    const cities = await this.getCities();
    const city = cities.find(c => 
      c.city_name.toLowerCase() === cityName.toLowerCase()
    );
    return city ? city.city_id : null;
  }
  
  /**
   * Find zone and area IDs by city and area name
   */
  private async findLocationIds(cityName: string, areaName: string): Promise<{
    cityId: number | null;
    zoneId: number | null;
    areaId: number | null;
  }> {
    const cityId = await this.findCityId(cityName);
    if (!cityId) {
      return { cityId: null, zoneId: null, areaId: null };
    }
    
    const zones = await this.getZones(cityId);
    
    // Try to find area in all zones
    for (const zone of zones) {
      const areas = await this.getAreas(zone.zone_id);
      const area = areas.find(a =>
        a.area_name.toLowerCase().includes(areaName.toLowerCase()) ||
        areaName.toLowerCase().includes(a.area_name.toLowerCase())
      );
      
      if (area) {
        return {
          cityId,
          zoneId: zone.zone_id,
          areaId: area.area_id,
        };
      }
    }
    
    return { cityId, zoneId: null, areaId: null };
  }
  
  /**
   * Get delivery rate
   */
  async getRate(request: CourierRateRequest): Promise<CourierRate> {
    try {
      const { cityId, zoneId, areaId } = await this.findLocationIds(
        request.city,
        request.area
      );
      
      if (!cityId || !zoneId || !areaId) {
        return {
          courier: 'pathao',
          deliveryFee: 0,
          totalCharge: 0,
          available: false,
        };
      }
      
      const weight = request.weight || 0.5; // Default 0.5kg
      const deliveryType = request.deliveryType === 'express' ? 12 : 48;
      
      const response = await this.makeAuthRequest('POST', '/merchant/price-plan', {
        store_id: this.storeIdNumber,
        item_type: 2, // 2 = Parcel
        delivery_type: deliveryType,
        item_weight: weight,
        recipient_city: cityId,
        recipient_zone: zoneId,
      });
      
      const deliveryFee = response.data.price || 60; // Default minimum charge
      const codCharge = request.codAmount ? (request.codAmount * 0.01) : 0; // 1% COD charge
      
      return {
        courier: 'pathao',
        deliveryFee,
        codCharge,
        totalCharge: deliveryFee + codCharge,
        estimatedDays: deliveryType === 12 ? 1 : 2,
        available: true,
      };
    } catch (error) {
      logger.error('Failed to get Pathao rate:', error as any);
      return {
        courier: 'pathao',
        deliveryFee: 0,
        totalCharge: 0,
        available: false,
      };
    }
  }
  
  /**
   * Create shipment order
   */
  async createShipment(request: CreateShipmentRequest): Promise<Shipment> {
    try {
      const { cityId, zoneId, areaId } = await this.findLocationIds(
        request.recipientCity,
        request.recipientArea
      );
      
      if (!cityId || !zoneId || !areaId) {
        throw new Error(`Invalid location: ${request.recipientCity}, ${request.recipientArea}`);
      }
      
      const deliveryType = request.deliveryType === 'express' ? 12 : 48;
      const weight = request.itemWeight || 0.5;
      
      const pathaoRequest: PathaoOrderRequest = {
        store_id: this.storeIdNumber,
        merchant_order_id: request.orderId,
        recipient_name: request.recipientName,
        recipient_phone: request.recipientPhone,
        recipient_address: request.recipientAddress,
        recipient_city: cityId,
        recipient_zone: zoneId,
        recipient_area: areaId,
        delivery_type: deliveryType,
        item_type: 2, // 2 = Parcel
        item_quantity: request.itemQuantity,
        item_weight: weight,
        amount_to_collect: request.isCOD ? (request.codAmount || 0) : 0,
        item_description: request.itemType,
        special_instruction: request.specialInstructions || '',
      };
      
      const response: PathaoOrderResponse = await this.makeAuthRequest(
        'POST',
        '/orders',
        pathaoRequest
      );
      
      if (response.code !== 200) {
        throw new Error(response.message || 'Failed to create Pathao order');
      }
      
      const storeInfo = await this.getStoreInfo();
      
      const shipment: Shipment = {
        orderId: request.orderId,
        orderNumber: request.orderId,
        courier: 'pathao',
        courierOrderId: response.data.consignment_id,
        trackingNumber: response.data.consignment_id,
        status: this.mapPathaoStatus(response.data.order_status),
        senderInfo: {
          name: storeInfo?.store_name || 'Scarlet Store',
          phone: storeInfo?.store_contact_phone || '',
          address: storeInfo?.store_address || '',
          city: 'Dhaka',
          area: '',
        },
        recipientInfo: {
          name: request.recipientName,
          phone: request.recipientPhone,
          email: request.recipientEmail,
          address: request.recipientAddress,
          city: request.recipientCity,
          area: request.recipientArea,
          postalCode: request.recipientPostalCode,
        },
        items: [],
        itemType: request.itemType,
        itemQuantity: request.itemQuantity,
        itemWeight: weight,
        itemValue: request.itemValue,
        deliveryFee: response.data.delivery_fee,
        codAmount: request.isCOD ? request.codAmount : undefined,
        isCOD: request.isCOD,
        trackingHistory: [
          {
            status: 'requested',
            message: 'Order created with Pathao',
            timestamp: new Date().toISOString(),
          },
        ],
        deliveryType: request.deliveryType || 'normal',
        specialInstructions: request.specialInstructions,
        courierResponse: response,
        createdBy: '', // Will be set by controller
        createdAt: new Date().toISOString(),
      };
      
      logger.info(`Pathao shipment created: ${response.data.consignment_id}`);
      return shipment;
    } catch (error) {
      logger.error('Failed to create Pathao shipment:', error as any);
      throw error;
    }
  }
  
  /**
   * Track shipment
   */
  async trackShipment(consignmentId: string): Promise<Shipment> {
    try {
      const response: PathaoTrackingResponse = await this.makeAuthRequest(
        'GET',
        `/orders/${consignmentId}`
      );
      
      if (response.code !== 200) {
        throw new Error(response.message || 'Failed to track Pathao order');
      }
      
      const trackingHistory = response.data.order_tracking.map(track => ({
        status: this.mapPathaoStatus(track.status),
        message: track.message,
        timestamp: track.time,
      }));
      
      const shipment: Partial<Shipment> = {
        courierOrderId: response.data.consignment_id,
        trackingNumber: response.data.consignment_id,
        status: this.mapPathaoStatus(response.data.order_status),
        trackingHistory,
        courierResponse: response,
        updatedAt: new Date().toISOString(),
      };
      
      return shipment as Shipment;
    } catch (error) {
      logger.error('Failed to track Pathao shipment:', error as any);
      throw error;
    }
  }
  
  /**
   * Cancel shipment
   */
  async cancelShipment(consignmentId: string): Promise<boolean> {
    try {
      // Pathao doesn't have a direct cancel endpoint in their public API
      // You need to contact support or use merchant dashboard
      logger.warn(`Manual cancellation required for Pathao order: ${consignmentId}`);
      return false;
    } catch (error) {
      logger.error('Failed to cancel Pathao shipment:', error as any);
      return false;
    }
  }
  
  /**
   * Check if service is available in area
   */
  async isAvailable(city: string, area: string): Promise<boolean> {
    const { cityId, zoneId, areaId } = await this.findLocationIds(city, area);
    return !!(cityId && zoneId && areaId);
  }
  
  /**
   * Map Pathao status to internal status
   */
  private mapPathaoStatus(pathaoStatus: string): ShipmentStatus {
    const statusMap: Record<string, ShipmentStatus> = {
      'Pending': 'requested',
      'Pickup_Request_Sent': 'pickup_pending',
      'Pickup_Request': 'pickup_pending',
      'Pickup_Pending': 'pickup_pending',
      'Pickup_Done': 'pickup_completed',
      'On_Hold': 'in_transit',
      'In_Transit': 'in_transit',
      'Transfer': 'in_transit',
      'Delivery_In_Progress': 'out_for_delivery',
      'Delivered': 'delivered',
      'Return': 'returned',
      'Returned': 'returned',
      'Cancelled': 'cancelled',
      'Failed': 'failed',
    };
    
    return statusMap[pathaoStatus] || 'pending';
  }
}

