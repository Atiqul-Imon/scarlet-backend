export interface AdminStats {
  totalUsers: number;
  totalOrders: number;
  totalRevenue: number;
  totalProducts: number;
  newUsersToday: number;
  ordersToday: number;
  revenueToday: number;
  pendingOrders: number;
  lowStockProducts: number;
  topSellingProducts: Array<{
    productId: string;
    name: string;
    sales: number;
    revenue: number;
  }>;
}

export interface AdminActivityLog {
  _id?: string;
  userId: string;
  userEmail: string;
  action: string;
  details?: any;
  timestamp: Date;
  ip: string;
  userAgent?: string;
}

export interface AdminUserFilters {
  role?: 'admin' | 'staff' | 'customer';
  isEmailVerified?: boolean;
  isPhoneVerified?: boolean;
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
}

export interface AdminProductFilters {
  category?: string;
  priceMin?: number;
  priceMax?: number;
  inStock?: boolean;
  lowStock?: boolean;
  search?: string;
}

export interface AdminOrderFilters {
  status?: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
  dateFrom?: Date;
  dateTo?: Date;
  minAmount?: number;
  maxAmount?: number;
  search?: string;
}

export interface SystemSettings {
  _id?: string;
  siteName: string;
  siteDescription: string;
  contactEmail: string;
  contactPhone: string;
  currency: string;
  timezone: string;
  lowStockThreshold: number;
  emailNotifications: boolean;
  maintenanceMode: boolean;
  allowRegistration: boolean;
  requireEmailVerification: boolean;
  socialMedia: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    youtube?: string;
  };
  paymentGateways: {
    stripe?: {
      enabled: boolean;
      publicKey?: string;
      secretKey?: string;
    };
    paypal?: {
      enabled: boolean;
      clientId?: string;
      clientSecret?: string;
    };
  };
  shippingZones: Array<{
    name: string;
    areas: string[];
    cost: number;
    freeShippingThreshold?: number;
  }>;
}

export interface AdminReportRequest {
  type: 'sales' | 'users' | 'products' | 'orders';
  dateFrom: Date;
  dateTo: Date;
  format: 'csv' | 'excel' | 'pdf';
  filters?: any;
}

export interface SalesAnalytics {
  period: string;
  revenue: number;
  orders: number;
  averageOrderValue: number;
  topProducts: Array<{
    productId: string;
    name: string;
    quantity: number;
    revenue: number;
  }>;
  revenueByCategory: Array<{
    category: string;
    revenue: number;
  }>;
  dailyRevenue: Array<{
    date: string;
    revenue: number;
    orders: number;
  }>;
}

export interface UserAnalytics {
  totalUsers: number;
  newUsers: number;
  activeUsers: number;
  usersByRole: Array<{
    role: string;
    count: number;
  }>;
  registrationTrend: Array<{
    date: string;
    count: number;
  }>;
  topCustomers: Array<{
    userId: string;
    name: string;
    totalOrders: number;
    totalSpent: number;
  }>;
}
