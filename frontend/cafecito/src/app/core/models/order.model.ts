export type KitchenOrderStatus = 'NEW'|'IN_PROGRESS'|'READY'|'DELIVERED'|'CANCELLED';

export interface KitchenOrderItem {
  productId: string;
  name: string;
  quantity: number;
  note?: string;
}

export interface KitchenOrder {
  _id: string;
  sessionId: string;
  userId: string;
  customerId?: string;
  items: KitchenOrderItem[];
  status: KitchenOrderStatus;
  ticket?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
