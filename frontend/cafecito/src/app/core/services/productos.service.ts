
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Producto, ProductosResponse } from '../models/product.model';

@Injectable({ providedIn: 'root' })
export class ProductosService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/api/productos`;

  listar(opts?: {
    page?: number; limit?: number; q?: string; categoria?: string;
    minPrecio?: number; maxPrecio?: number; activo?: boolean;
  }): Observable<ProductosResponse> {
    let params = new HttpParams();
    if (opts?.page) params = params.set('page', String(opts.page));
    if (opts?.limit) params = params.set('limit', String(opts.limit));
    if (opts?.q) params = params.set('q', opts.q);
    if (opts?.categoria) params = params.set('categoria', opts.categoria);
    if (opts?.minPrecio !== undefined) params = params.set('minPrecio', String(opts.minPrecio));
    if (opts?.maxPrecio !== undefined) params = params.set('maxPrecio', String(opts.maxPrecio));
    if (opts?.activo !== undefined) params = params.set('activo', String(opts.activo));
    return this.http.get<ProductosResponse>(this.base, { params });
  }

  obtenerPorId(id: string): Observable<Producto> {
    return this.http.get<Producto>(`${this.base}/${id}`);
  }

  crear(dto: Omit<Producto, '_id' | 'createdAt' | 'updatedAt'>): Observable<Producto> {
    return this.http.post<Producto>(this.base, dto);
  }

  actualizar(id: string, dto: Partial<Producto>): Observable<Producto> {
    return this.http.put<Producto>(`${this.base}/${id}`, dto);
  }

  eliminar(id: string): Observable<{ message: string; id: string }> {
    return this.http.delete<{ message: string; id: string }>(`${this.base}/${id}`);
  }
}
