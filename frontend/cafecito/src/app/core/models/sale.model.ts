export type PaidWith = 'CASH' | 'CARD' | 'MIXED';

export interface CreateSaleItem {
  productId: string;
  quantity: number;
}

export interface Sale {
  _id: string;
  sessionId: string;
  userId: string;
  paidWith: PaidWith;
  status: 'COMPLETED' | 'CANCELLED' | 'REFUNDED_PARTIAL' | 'REFUNDED_FULL';
  gross: number;
  taxes: number;
  total: number;
  createdAt: string;
}