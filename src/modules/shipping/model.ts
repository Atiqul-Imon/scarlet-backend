export type CourierService = 'pathao' | 'redx' | 'steadfast';
export type ShipmentStatus = 
  | 'pending'           // Created but not sent to courier
  | 'requested'         // Sent to courier API
  | 'pickup_pending'    // Courier will pick up
  | 'pickup_completed'  // Courier picked up
  | 'in_transit'        // On the way
  | 'out_for_delivery'  // Out for delivery
  | 'delivered'         // Successfully delivered
  | 'returned'          // Returned to sender
  | 'cancelled'         // Cancelled
  | 'failed';           // Delivery failed

export interface CourierConfig {
  name: string;
  enabled: boolean;
  apiKey?: string;
  apiSecret?: string;
  storeId?: string;
  baseUrl?: string;
  sandbox?: boolean;
}

export interface ShipmentItem {
  productId: string;
  title: string;
  quantity: number;
  price: number;
}

export interface ShipmentAddress {
  name: string;
  phone: string;
  email?: string;
  address: string;
  city: string;
  area: string;
  postalCode: string;
}

export interface ShipmentTracking {
  status: ShipmentStatus;
  message: string;
  timestamp: string;
  location?: string;
}

export interface Shipment {
  _id?: string;
  orderId: string;
  orderNumber: string;
  courier: CourierService;
  courierOrderId?: string;        // Courier's tracking/consignment ID
  trackingNumber?: string;         // Public tracking number
  status: ShipmentStatus;
  
  // Shipment details
  senderInfo: {
    name: string;
    phone: string;
    address: string;
    city: string;
    area: string;
  };
  
  recipientInfo: ShipmentAddress;
  
  // Package details
  items: ShipmentItem[];
  itemType: string;                // e.g., 'Cosmetics', 'Clothing'
  itemQuantity: number;
  itemWeight?: number;              // in kg
  itemValue: number;                // product value
  
  // Pricing
  deliveryFee: number;
  codAmount?: number;               // Cash on Delivery amount
  isCOD: boolean;
  
  // Tracking
  trackingHistory: ShipmentTracking[];
  estimatedDelivery?: string;
  actualDeliveryDate?: string;
  
  // Additional info
  specialInstructions?: string;
  deliveryType?: 'normal' | 'express';
  
  // API Response
  courierResponse?: any;            // Raw response from courier API
  
  // Metadata
  createdBy: string;                // Admin user ID
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateShipmentRequest {
  orderId: string;
  courier: CourierService;
  recipientName: string;
  recipientPhone: string;
  recipientEmail?: string;
  recipientAddress: string;
  recipientCity: string;
  recipientArea: string;
  recipientPostalCode: string;
  itemType: string;
  itemQuantity: number;
  itemWeight?: number;
  itemValue: number;
  deliveryFee: number;
  codAmount?: number;
  isCOD: boolean;
  specialInstructions?: string;
  deliveryType?: 'normal' | 'express';
}

export interface CourierRateRequest {
  city: string;
  area: string;
  weight?: number;
  codAmount?: number;
  deliveryType?: 'normal' | 'express';
}

export interface CourierRate {
  courier: CourierService;
  deliveryFee: number;
  codCharge?: number;
  totalCharge: number;
  estimatedDays?: number;
  available: boolean;
}

// Pathao specific types
export interface PathaoStore {
  store_id: number;
  store_name: string;
  store_contact_name: string;
  store_contact_phone: string;
  store_address: string;
  city_id: number;
  zone_id: number;
  area_id: number;
}

export interface PathaoCity {
  city_id: number;
  city_name: string;
}

export interface PathaoZone {
  zone_id: number;
  zone_name: string;
  city_id: number;
}

export interface PathaoArea {
  area_id: number;
  area_name: string;
  zone_id: number;
  post_code?: string;
}

export interface PathaoOrderRequest {
  store_id: number;
  merchant_order_id: string;
  recipient_name: string;
  recipient_phone: string;
  recipient_address: string;
  recipient_city: number;
  recipient_zone: number;
  recipient_area: number;
  delivery_type: number;  // 48 for normal, 12 for express
  item_type: number;      // Item type ID
  special_instruction?: string;
  item_quantity: number;
  item_weight: number;
  amount_to_collect: number;
  item_description?: string;
}

export interface PathaoOrderResponse {
  type: string;
  code: number;
  message: string;
  data: {
    consignment_id: string;
    merchant_order_id: string;
    order_status: string;
    delivery_fee: number;
  };
}

export interface PathaoTrackingResponse {
  type: string;
  code: number;
  message: string;
  data: {
    consignment_id: string;
    order_status: string;
    order_status_title: string;
    order_tracking: Array<{
      status: string;
      time: string;
      message: string;
    }>;
  };
}

