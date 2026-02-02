
// src/app/pages/pos/pos.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PosService } from '../../services/pos';

@Component({
  selector: 'app-pos',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pos.html',
  styleUrls: ['./pos.scss']
})
export class PosComponent implements OnInit {
  private pos = inject(PosService);
  products: any[] = [];
  sale: any = null;
  openSales: any[] = [];
  loading = false;
  errorMsg = '';

  ngOnInit() {
    this.loadProducts();
    this.refreshOpen();
  }

  loadProducts() {
    this.pos.getProducts().subscribe({
      next: (p) => this.products = p,
      error: () => this.errorMsg = 'Error cargando productos'
    });
  }

  refreshOpen() {
    this.pos.getOpenSales().subscribe({
      next: (t) => this.openSales = t,
      error: () => this.errorMsg = 'Error cargando tickets abiertos'
    });
  }

  createTicket() {
    this.loading = true;
    this.pos.createOpenSale().subscribe({
      next: (s) => { this.sale = s; this.refreshOpen(); this.loading = false; },
      error: () => { this.errorMsg = 'Error creando ticket'; this.loading = false; }
    });
  }

  add(p: any) {
    if (!this.sale) return;
    this.pos.addItem(this.sale._id, p._id, 1).subscribe({
      next: (s) => this.sale = s,
      error: () => this.errorMsg = 'Error agregando producto'
    });
  }

  remove(p: any) {
    if (!this.sale) return;
    this.pos.removeItem(this.sale._id, p._id, 1).subscribe({
      next: (s) => this.sale = s,
      error: () => this.errorMsg = 'Error quitando producto'
    });
  }

  /** <-- ESTE MÉTODO FALTABA */
  pay() {
    if (!this.sale) return;
    this.pos.paySale(this.sale._id).subscribe({
      next: (s) => {
        this.sale = s;
        this.refreshOpen();
        alert(`Venta pagada. Total: $${s.total}`);
      },
      error: () => this.errorMsg = 'Error al pagar'
    });
  }

  /** <-- ESTE MÉTODO FALTABA */
  loadTicket(id: string) {
    this.pos.getSaleById(id).subscribe({
      next: (s) => this.sale = s,
      error: () => this.errorMsg = 'Error cargando ticket'
    });
  }}
