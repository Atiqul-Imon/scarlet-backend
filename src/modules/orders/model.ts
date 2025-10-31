export type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'delivered' | 'cancelled' | 'refunded';
export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
export type PaymentMethod = 'bkash' | 'nagad' | 'rocket' | 'card' | 'cod' | 'sslcommerz';

export interface OrderItem {
  productId: string;
  title: string;
  slug: string;
  image: string;
  price: number;
  quantity: number;
  brand?: string;
  sku?: string;
}

export interface ShippingAddress {
  firstName: string;
  lastName?: string; // Made optional
  email?: string; // Made optional
  phone: string;
  address: string;
  // Location-based fields
  deliveryArea: 'inside_dhaka' | 'outside_dhaka'; // Delivery location selection
  dhakaArea?: string; // Thana/Area in Dhaka (for inside_dhaka)
  division?: string; // Division/City (for outside_dhaka)
  district?: string; // District/Zilla (for outside_dhaka)
  upazilla?: string; // Upazilla (for outside_dhaka)
  // Legacy fields (keep for backward compatibility)
  city: string;
  area: string;
  postalCode: string;
}

export interface PaymentInfo {
  method: PaymentMethod;
  status: PaymentStatus;
  transactionId?: string;
  bankTransactionId?: string; // SSLCommerz bank_tran_id for refunds
  paymentDate?: string;
}

export interface Order {
  _id?: string;
  orderNumber: string;
  userId?: string; // Made optional for guest orders
  guestId?: string; // For guest orders
  items: OrderItem[];
  subtotal: number;
  shipping: number;
  tax: number;
  discount: number;
  total: number;
  currency: string;
  status: OrderStatus;
  shippingAddress: ShippingAddress;
  paymentInfo: PaymentInfo;
  notes?: string;
  deliveredAt?: string;
  isGuestOrder?: boolean;
  createdAt?: string;
  updatedAt?: string;
}


