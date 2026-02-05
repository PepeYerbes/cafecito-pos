import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

// Modelos
import {
  CashSession,
  CashMovement as ApiCashMovement
} from '../models/cash.model';

import {
  CreateSaleItem,
  PaidWith,
  Sale
} from '../models/sale.model';

@Injectable({ providedIn: 'root' })
export class PosApiService {
  private http = inject(HttpClient);
  private base = environment.apiBaseUrl;

  /* ============================================================
   * CAJA (endpoints nuevos)
   * ============================================================ */

  /**
   * Abrir caja
   * POST /api/cash/register/open
   * Body: { initialCash: number }
   */
  openCash(initialCash: number) {
    return this.http.post<CashSession>(`${this.base}/cash/register/open`, { initialCash });
  }

  /**
   * Obtener sesión abierta (si existe)
   * GET /api/cash/register/current
   */
  getCurrentCash() {
    return this.http.get<CashSession>(`${this.base}/cash/register/current`);
  }

  /**
   * Agregar movimiento manual de caja
   * POST /api/cash/register/movement
   * Body: { type:'INGRESO'|'EGRESO', amount:number, reason?:string }
   *
   * Si tu UI aún usa 'IN'|'OUT', se mapea automáticamente.
   */
  addCashMovement(
    type: 'INGRESO' | 'EGRESO' | 'IN' | 'OUT',
    amount: number,
    reason?: string
  ) {
    const mappedType = type === 'IN' ? 'INGRESO' : type === 'OUT' ? 'EGRESO' : type;
    return this.http.post<CashSession>(`${this.base}/cash/register/movement`, {
      type: mappedType,
      amount,
      reason
    });
  }

  /**
   * Cerrar caja
   * POST /api/cash/register/close
   * Body: { countedCash:number, notes?:string }
   */
  closeCash(countedCash: number, notes?: string) {
    return this.http.post<CashSession>(`${this.base}/cash/register/close`, {
      countedCash,
      notes
    });
  }

  /**
   * Obtener detalle de una sesión por ID (JSON del reporte)
   * GET /api/cash/register/:id/report?format=json
   */
  getCashSession(id: string) {
    return this.http.get<CashSession>(`${this.base}/cash/register/${id}/report?format=json`);
  }

  /**
   * Descargar PDF del cierre de sesión
   * GET /api/cash/register/:id/report?format=pdf
   */
  downloadCashPdf(id: string) {
    return this.http.get(`${this.base}/cash/register/${id}/report?format=pdf`, {
      responseType: 'blob'
    });
  }

  /* ============================================================
   * VENTAS
   * ============================================================ */

  /**
   * Crear venta (mínimo para generar ticket / flujo de caja)
   * POST /api/sales
   */
  createSale(payload: {
    items: { productId: string; quantity: number }[];
    paidWith: PaidWith; // 'CASH'|'CARD'|'MIXED'
    discount?: number;
    notes?: string;
  }) {
    return this.http.post<Sale | any>(`${this.base}/sales`, payload);
  }

  /**
   * Cancelar venta
   * POST /api/sales/:saleId/cancel
   */
  cancelSale(saleId: string) {
    return this.http.post<any>(`${this.base}/sales/${saleId}/cancel`, {});
  }

  /**
   * Devolver productos de una venta
   * POST /api/sales/:saleId/return
   */
  returnSale(saleId: string, items: CreateSaleItem[], reason: string) {
    return this.http.post<any>(`${this.base}/sales/${saleId}/return`, { items, reason });
  }

  /* ============================================================
   * ⚠️ Métodos legacy eliminados (usaban rutas antiguas):
   *  - getCashSession(id)(sessionId: string)
   *  - getSessionReport(sessionId: string)
   *  - getSaleTicketPdfBlob(saleId: string)
   *  - downloadCashPdf(sessionId: string)
   *
   * Sustituciones:
   *  - Detalle/Resumen de sesión: getCashSession(id)  (JSON)
   *  - PDF de sesión:             downloadCashPdf(id) (Blob)
   *  - Ticket de venta PDF:       si mantienes tickets, define endpoint actual en backend y lo añadimos aquí.
   * ============================================================ */
}