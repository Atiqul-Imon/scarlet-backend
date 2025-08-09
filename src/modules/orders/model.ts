export type OrderStatus = 'pending' | 'paid' | 'failed' | 'cancelled' | 'fulfilled';
export interface OrderItem { productId: string; title: string; price: number; quantity: number; }
export interface Order { _id?: string; userId: string; items: OrderItem[]; subtotal: number; discount: number; total: number; status: OrderStatus; createdAt?: string; updatedAt?: string; }


