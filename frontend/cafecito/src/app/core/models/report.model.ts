import { CashSession } from './cash.model';

export interface SessionReport {
  session: CashSession;
  grossSales: number;
  taxes: number;
  netSales: number;
  countSales: number;
  byPayment: { CASH: number; CARD: number; MIXED: number };
  returns: { count: number; amount: number };
  topProducts: Array<{ productId: string; name: string; qty: number; revenue: number }>;
  expectedAmount: number;
}