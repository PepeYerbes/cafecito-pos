import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';

import { PosApiService } from '../../../../core/services/pos-api.service';
import { CashSession } from '../../../../core/models/cash.model';

import { ProductGridComponent } from '../../components/product-grid/product-grid';
import { CartComponent } from '../../components/cart/cart';
import { TotalsComponent } from '../../components/totals/totals';

// NEW
import { ProductosService } from '../../../../core/services/productos.service';
import { Producto } from '../../../../core/models/product.model';
import { PosStateService } from '../../../../core/state/pos-state.service';

@Component({
  selector: 'app-pos-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    RouterLinkActive,
    ProductGridComponent,
    CartComponent,
    TotalsComponent
  ],
  templateUrl: './pos-page.html',
  styleUrls: ['./pos-page.css']
})
export class PosPageComponent implements OnInit {
  cash = signal<CashSession | null>(null);
  loadingCash = signal<boolean>(true);
  errorCash = signal<string | null>(null);
  hasOpenSession = computed(() => !!this.cash());

  // NEW: productos para el grid
  productos = signal<Producto[]>([]);
  loadingProducts = signal<boolean>(true);

  constructor(
    private api: PosApiService,
    private router: Router,
    // NEW
    private productosService: ProductosService,
    private posState: PosStateService
  ) {}

  ngOnInit(): void {
    // Estado de caja
    this.api.getCurrentCash().subscribe({
      next: (s) => { this.cash.set(s); this.loadingCash.set(false); },
      error: () => { this.cash.set(null); this.loadingCash.set(false); }
    });

    // NEW: cargar productos (primer página 24 items)
    this.productosService.listar({ page: 1, limit: 24, activo: true }).subscribe({
      next: (res) => { this.productos.set(res.data); this.loadingProducts.set(false); },
      error: () => { this.productos.set([]); this.loadingProducts.set(false); }
    });
  }

  goOpenShift() { this.router.navigate(['/pos/open-shift']); }
  goCloseShift() { this.router.navigate(['/pos/close-shift']); }

  // NEW: handler para agregar al carrito
  addProduct(p: Producto) { this.posState.addProduct(p); }
}
``