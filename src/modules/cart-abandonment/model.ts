export interface CartAbandonment {
  _id?: string;
  sessionId: string;
  userId?: string; // Optional - for logged in users
  guestId?: string; // For guest users
  items: {
    productId: string;
    title: string;
    slug: string;
    image: string;
    price: number;
    quantity: number;
    brand?: string;
  }[];
  totalValue: number;
  currency: string;
  email?: string; // For guest users who provided email
  phone?: string; // For guest users who provided phone
  abandonedAt: string;
  lastActivityAt: string;
  recoveryEmailsSent: number;
  recoverySmsSent: number;
  recovered: boolean;
  recoveredAt?: string;
  recoveredOrderId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CartAbandonmentRecovery {
  _id?: string;
  cartAbandonmentId: string;
  type: 'email' | 'sms';
  sentAt: string;
  opened?: boolean;
  clicked?: boolean;
  recovered?: boolean;
  createdAt?: string;
}
