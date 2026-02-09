import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule, NgIf } from '@angular/common';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';

import { PosApiService } from '../../../../core/services/pos-api.service';
import { CashSession } from '../../../../core/models/cash.model';

import { ProductGridComponent } from '../../components/product-grid/product-grid';
import { CartComponent } from '../../components/cart/cart';
import { TotalsComponent } from '../../components/totals/totals';

import { ProductosService } from '../../../../core/services/productos.service';
import { Producto } from '../../../../core/models/product.model';
import { PosStateService } from '../../../../core/state/pos-state.service';

// Picker de cliente
import { CustomerPickerComponent } from '../../components/customer-picker/customer-picker';
import { Customer } from '../../../../core/services/customers.service';

@Component({
  selector: 'app-pos-page',
  standalone: true,
  imports: [
    CommonModule,
    NgIf,
    RouterLink,
    RouterLinkActive,
    ProductGridComponent,
    CartComponent,
    TotalsComponent,
    CustomerPickerComponent
  ],
  templateUrl: './pos-page.html',
  styleUrls: ['./pos-page.css']
})
export class PosPageComponent implements OnInit {
  cash = signal<CashSession | null>(null);
  loadingCash = signal<boolean>(true);
  errorCash = signal<string | null>(null);
  hasOpenSession = computed(() => !!this.cash());

  productos = signal<Producto[]>([]);
  loadingProducts = signal<boolean>(true);

  // Cliente seleccionado
  selectedCustomer = signal<Customer | null>(null);

  constructor(
    private api: PosApiService,
    private router: Router,
    private productosService: ProductosService,
    private posState: PosStateService
  ) {}

  ngOnInit(): void {
    // Estado de caja
    this.api.getCurrentCash().subscribe({
      next: (s) => { this.cash.set(s); this.loadingCash.set(false); },
      error: () => { this.cash.set(null); this.loadingCash.set(false); }
    });

    // Productos
    this.productosService.listar({ page: 1, limit: 24, activo: true }).subscribe({
      next: (res) => { this.productos.set(res.data); this.loadingProducts.set(false); },
      error: () => { this.productos.set([]); this.loadingProducts.set(false); }
    });
  }

  goOpenShift() { this.router.navigate(['/pos/open-shift']); }
  goCloseShift() { this.router.navigate(['/pos/close-shift']); }

  addProduct(p: Producto) { this.posState.addProduct(p); }

  setCustomer(c: Customer | null) { this.selectedCustomer.set(c); }

  onCheckout() {
    const items = this.posState.items().map(it => ({ productId: it.producto._id, quantity: it.qty }));
    if (!items.length) return;
    this.api.createSale({
      items,
      paidWith: 'CASH',
      discount: 0,
      notes: '',
      customerId: this.selectedCustomer()?._id
    }).subscribe({
      next: () => {
        alert('Venta registrada');
        this.posState.clear();
      },
      error: (e) => alert(e?.error?.message || 'Error registrando venta')
    });
  }
}