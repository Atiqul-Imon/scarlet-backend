export interface CartItem { 
  productId: string; 
  quantity: number; 
  selectedSize?: string;
}
export interface Cart { 
  _id?: string; 
  userId?: string; // Made optional for guest carts
  sessionId?: string; // For guest carts
  items: CartItem[]; 
  updatedAt?: string; 
  isGuestCart?: boolean;
}


