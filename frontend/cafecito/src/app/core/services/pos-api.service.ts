// src/app/core/services/pos-api.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

import { CashSession } from '../models/cash.model';
import { CreateSaleItem, PaidWith, Sale } from '../models/sale.model';

@Injectable({ providedIn: 'root' })
export class PosApiService {
  private http = inject(HttpClient);
  private base = environment.apiBaseUrl;

  // ===== Caja =====
  openCash(initialCash: number) {
    return this.http.post<CashSession>(`${this.base}/cash/register/open`, { initialCash });
  }
  getCurrentCash() {
    return this.http.get<CashSession>(`${this.base}/cash/register/current`);
  }
  addCashMovement(
    type: 'INGRESO' | 'EGRESO' | 'IN' | 'OUT',
    amount: number,
    reason?: string
  ) {
    const mappedType = type === 'IN' ? 'INGRESO' : type === 'OUT' ? 'EGRESO' : type;
    return this.http.post<CashSession>(`${this.base}/cash/register/movement`, {
      type: mappedType, amount, reason
    });
  }
  closeCash(countedCash: number, notes?: string) {
    return this.http.post<CashSession>(`${this.base}/cash/register/close`, { countedCash, notes });
  }
  getCashSession(id: string) {
    return this.http.get<CashSession>(`${this.base}/cash/register/${id}/report?format=json`);
  }
  downloadCashPdf(id: string) {
    return this.http.get(`${this.base}/cash/register/${id}/report?format=pdf`, {
      responseType: 'blob'
    });
  }
  getCloseHistory(opts?: { page?: number; pageSize?: number; from?: string; to?: string }) {
    const params = new URLSearchParams();
    if (opts?.page)     params.set('page',     String(opts.page));
    if (opts?.pageSize) params.set('pageSize', String(opts.pageSize));
    if (opts?.from)     params.set('from',     opts.from);
    if (opts?.to)       params.set('to',       opts.to);
    const qs = params.toString();
    const url = `${this.base}/cash/register/history${qs ? '?' + qs : ''}`;
    return this.http.get<{ total: number; page: number; pageSize: number; items: any[] }>(url);
  }

  // ===== Ventas =====
  createSale(payload: {
    items: { productId: string; quantity: number }[];
    paidWith: PaidWith;
    discount?: number;
    notes?: string;
    customerId?: string;
  }) {
    return this.http.post<Sale>(`${this.base}/sales`, payload);
  }

  /** Descarga el ticket PDF de una venta como Blob */
  getSaleTicketPdf(saleId: string) {
    return this.http.get(`${this.base}/sales/${saleId}/ticket`, { responseType: 'blob' });
  }

  cancelSale(saleId: string) {
    return this.http.post<any>(`${this.base}/sales/${saleId}/cancel`, {});
  }
  returnSale(saleId: string, items: CreateSaleItem[], reason: string) {
    return this.http.post<any>(`${this.base}/sales/${saleId}/return`, { items, reason });
  }
}