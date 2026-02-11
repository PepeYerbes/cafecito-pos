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
import { CustomerPickerComponent } from '../../components/customer-picker/customer-picker';
import { Customer } from '../../../../core/services/customers.service';
import { environment } from '../../../../../environments/environment';

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
    if (!this.posState.items().length) return;
    this.router.navigate(['/pos/checkout'], {
      queryParams: { customerId: this.selectedCustomer()?._id || null }
    });
  }

  onSendToKitchen() {
    if (!this.posState.items().length) return;
    const items = this.posState.toOrderItems();
    const customerId = this.selectedCustomer()?._id;

    this.api.createKitchenOrder({ items, customerId }).subscribe({
      next: (order) => {
        alert(`Comanda enviada a cocina (Ticket: ${order.ticket || order._id.slice(-6)})`);
        // Flujo recomendado: ir a cobro inmediatamente después
        this.router.navigate(['/pos/checkout'], {
          queryParams: { customerId: customerId || null }
        });
      },
      error: (e) => {
        // Mostrar mensajes de backend (422/400)
        const msg = e?.error?.error || e?.error?.message || 'Error creando comanda';
        const details = e?.error?.details;
        alert(details ? `${msg}\n${details.map((d:any)=>d.message||JSON.stringify(d)).join('\n')}` : msg);
      }
    });
  }
}
