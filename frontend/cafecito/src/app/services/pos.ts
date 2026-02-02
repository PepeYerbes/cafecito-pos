
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class PosService {
  private http = inject(HttpClient);
  private base = 'http://localhost:3001/api'; // Ajusta si usas .env con proxy

  // Productos
  getProducts() {
    return this.http.get<any[]>(`${this.base}/products`);
  }

  // Ventas
  createOpenSale(body: { customerId?: string } = {}) {
    return this.http.post<any>(`${this.base}/sales`, body);
  }

  addItem(saleId: string, productId: string, quantity: number) {
    return this.http.patch<any>(`${this.base}/sales/${saleId}/items`, {
      action: 'add',
      productId,
      quantity
    });
  }

  removeItem(saleId: string, productId: string, quantity: number) {
    return this.http.patch<any>(`${this.base}/sales/${saleId}/items`, {
      action: 'remove',
      productId,
      quantity
    });
  }

  paySale(saleId: string, customerId?: string) {
    return this.http.post<any>(`${this.base}/sales/${saleId}/pay`, { customerId });
  }

  getOpenSales() {
    return this.http.get<any[]>(`${this.base}/sales/open`);
  }

  getSaleById(saleId: string) {
    return this.http.get<any>(`${this.base}/sales/${saleId}`);
  }
}

