import type { CourierRate, CourierRateRequest, CreateShipmentRequest, Shipment } from '../model.js';

/**
 * Base interface for all courier service integrations
 */
export interface ICourierGateway {
  /**
   * Get delivery rate/charge for a shipment
   */
  getRate(request: CourierRateRequest): Promise<CourierRate>;
  
  /**
   * Create a new shipment/order with the courier
   */
  createShipment(request: CreateShipmentRequest): Promise<Shipment>;
  
  /**
   * Track shipment status
   */
  trackShipment(trackingNumber: string): Promise<Shipment>;
  
  /**
   * Cancel a shipment
   */
  cancelShipment(trackingNumber: string): Promise<boolean>;
  
  /**
   * Check if service is available in the area
   */
  isAvailable(city: string, area: string): Promise<boolean>;
}

export abstract class BaseCourierGateway implements ICourierGateway {
  protected apiKey: string;
  protected apiSecret: string;
  protected baseUrl: string;
  protected storeId?: string;
  protected sandbox: boolean;
  
  constructor(config: {
    apiKey: string;
    apiSecret: string;
    baseUrl: string;
    storeId?: string;
    sandbox?: boolean;
  }) {
    this.apiKey = config.apiKey;
    this.apiSecret = config.apiSecret;
    this.baseUrl = config.baseUrl;
    this.storeId = config.storeId;
    this.sandbox = config.sandbox || false;
  }
  
  abstract getRate(request: CourierRateRequest): Promise<CourierRate>;
  abstract createShipment(request: CreateShipmentRequest): Promise<Shipment>;
  abstract trackShipment(trackingNumber: string): Promise<Shipment>;
  abstract cancelShipment(trackingNumber: string): Promise<boolean>;
  abstract isAvailable(city: string, area: string): Promise<boolean>;
  
  /**
   * Helper method for making HTTP requests
   */
  protected async makeRequest(
    method: string,
    endpoint: string,
    data?: any,
    headers?: Record<string, string>
  ): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...headers,
      },
      body: data ? JSON.stringify(data) : undefined,
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Courier API Error: ${response.status} - ${errorText}`);
    }
    
    return response.json();
  }
}

