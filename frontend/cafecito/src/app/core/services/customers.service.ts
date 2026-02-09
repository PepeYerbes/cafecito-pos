import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface Customer {
  _id: string;
  name: string;
  phone?: string;
  email?: string;
  birthdate?: string;
  notes?: string;
  points?: number;
  totalSpent?: number;
  visitsCount?: number;
  lastVisit?: string;
  active?: boolean;
}

@Injectable({ providedIn: 'root' })
export class CustomersService {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/customers`;

  list(opts?: { q?: string; page?: number; limit?: number }) {
    let params = new HttpParams();
    if (opts?.q) params = params.set('q', opts.q);
    if (opts?.page) params = params.set('page', String(opts.page));
    if (opts?.limit) params = params.set('limit', String(opts.limit));
    return this.http.get<{ data: Customer[]; page: number; limit: number; total: number; totalPages: number }>(this.base, { params });
  }

  create(dto: Partial<Customer>) {
    return this.http.post<Customer>(this.base, dto);
  }

  update(id: string, dto: Partial<Customer>) {
    return this.http.patch<Customer>(`${this.base}/${id}`, dto);
  }

  remove(id: string) {
    return this.http.delete<{ ok: boolean; id: string }>(`${this.base}/${id}`);
  }

  redeem(id: string, points: number) {
    return this.http.post<{ ok: boolean; customer: Customer }>(`${this.base}/${id}/redeem`, { points });
  }
}