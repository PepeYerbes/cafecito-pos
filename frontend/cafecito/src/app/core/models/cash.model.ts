/** Estado de la sesión de caja */
export type CashSessionStatus = 'OPEN' | 'CLOSED';

/** Método de pago según backend */
export type PaymentMethod = 'CASH' | 'CARD' | 'MIXED';

/** Movimiento manual de caja */
export interface CashMovement {
  type: 'INGRESO' | 'EGRESO';
  reason?: string;         // texto libre desde backend (antes tenías enum de motivos)
  amount: number;
  createdAt: string;       // ISO
}

/** Totales de ventas en la sesión */
export interface CashTotals {
  gross: number;           // suma subtotales (sin IVA)
  taxes: number;           // IVA
  discount: number;        // descuentos aplicados
  total: number;           // total neto (gross + taxes - discount)
}

/** Resumen por forma de pago */
export interface CashPaymentSummary {
  method: PaymentMethod;   // 'CASH' | 'CARD' | 'MIXED'
  total: number;
  count: number;           // número de ventas por método
}

/** Sesión de caja, tal como la devuelve el backend */
export interface CashSession {
  _id: string;

  openedBy?: string;       // ObjectId string (si lo retornas poblado, puede ser objeto)
  openedAt: string;

  status: CashSessionStatus;

  initialCash: number;     // 💡 antes lo llamabas openingAmount
  movements?: CashMovement[];

  // Campos de cierre:
  closedBy?: string;
  closedAt?: string;
  countedCash?: number;    // 💡 antes closingAmount
  expectedCash?: number;   // 💡 antes expectedAmount
  difference?: number;     // contado - esperado (puede ser negativo)

  totals?: CashTotals;     // totales agregados desde Sales
  payments?: CashPaymentSummary[];

  notes?: string;
}

/* ============================================================
   Opcional: Tipos "legacy" para no romper código existente
   (puedes eliminar esta sección cuando migres totalmente)
   ============================================================ */

export type LegacyCashSessionStatus = CashSessionStatus;

export interface LegacyCashSession {
  _id: string;
  userId?: string;          // mapeable desde openedBy/closedBy si lo necesitas
  openedAt: string;
  closedAt?: string;
  openingAmount: number;    // -> initialCash
  closingAmount?: number;   // -> countedCash
  expectedAmount?: number;  // -> expectedCash
  status: LegacyCashSessionStatus;
}

/** Resumen que tenías; puedes derivarlo desde CashSession */
export interface SessionSummary {
  session: LegacyCashSession;
  grossSales: number;
  taxes: number;
  netSales: number;
  countSales: number;
  movIn: number;
  movOut: number;
  expectedAmount: number;
  returns: { count: number; amount: number };
}

/** Helper opcional para mapear una CashSession "nueva" a tu LegacyCashSession */
export function mapToLegacySession(s: CashSession): LegacyCashSession {
  return {
    _id: s._id,
    userId: s.openedBy || s.closedBy,     // o manejarlo mejor según tu UI
    openedAt: s.openedAt,
    closedAt: s.closedAt,
    openingAmount: s.initialCash,
    closingAmount: s.countedCash,
    expectedAmount: s.expectedCash,
    status: s.status
  };
}