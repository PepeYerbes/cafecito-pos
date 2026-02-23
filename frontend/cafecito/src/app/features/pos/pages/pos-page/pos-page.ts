// src/app/features/pos/pages/pos-page/pos-page.ts
import { Component, OnInit, OnDestroy, computed, inject, signal } from '@angular/core';
import { CommonModule, NgIf } from '@angular/common';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';

import { PosApiService } from '../../../../core/services/pos-api.service';
import { ProductosService } from '../../../../core/services/products.service';
import { ToastService } from '../../../../core/services/toast.service';
import { CashSession } from '../../../../core/models/cash.model';
import { Producto } from '../../../../core/models/product.model';
import { PaidWith, Sale } from '../../../../core/models/sale.model';
import { PosStateService } from '../../../../core/state/pos-state.service';
import { ProductGridComponent } from '../../components/product-grid/product-grid';
import { CartComponent } from '../../components/cart/cart';
import { TotalsComponent } from '../../components/totals/totals';
import { CustomerPickerComponent } from '../../components/customer-picker/customer-picker';
import { Customer } from '../../../../core/services/customers.service';

@Component({
  selector: 'app-pos-page',
  standalone: true,
  imports: [
    CommonModule,
    NgIf,
    FormsModule,
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
export class PosPageComponent implements OnInit, OnDestroy {

  // ✅ inject() para todos los servicios
  private api              = inject(PosApiService);
  private router           = inject(Router);
  private productosService = inject(ProductosService);
  private toast            = inject(ToastService);
  public  posState         = inject(PosStateService);

  cash            = signal<CashSession | null>(null);
  loadingCash     = signal<boolean>(true);
  hasOpenSession  = computed(() => !!this.cash());

  productos       = signal<Producto[]>([]);
  loadingProducts = signal<boolean>(true);

  selectedCustomer = signal<Customer | null>(null);

  // Checkout modal
  showCheckout    = signal<boolean>(false);
  paidWith        = signal<PaidWith>('CASH');
  discount        = signal<number>(0);
  saleNotes       = signal<string>('');
  checkoutLoading = signal<boolean>(false);

  // Ticket post-venta
  lastSaleId = signal<string | null>(null);

  // ✅ Sidebar auto-hide
  sidebarCollapsed = signal<boolean>(false);
  private hideTimer: ReturnType<typeof setTimeout> | null = null;

  private sub = new Subscription();

  ngOnInit(): void {
    this.api.getCurrentCash().subscribe({
      next:  s  => { this.cash.set(s);    this.loadingCash.set(false); },
      error: () => { this.cash.set(null); this.loadingCash.set(false); }
    });

    this.productosService.listar({ page: 1, limit: 48, activo: true }).subscribe({
      next:  res => { this.productos.set(res.data); this.loadingProducts.set(false); },
      error: ()  => { this.productos.set([]);        this.loadingProducts.set(false); }
    });

    // Toasts del carrito
    this.sub.add(
      this.posState.cartEvents$.subscribe(ev => {
        switch (ev.type) {
          case 'added':   this.toast.success(`✔ ${ev.name} agregado`); break;
          case 'removed': this.toast.info(`🗑 ${ev.name} eliminado`);  break;
          case 'cleared': this.toast.warning('Pedido vaciado');         break;
        }
      })
    );

    // ✅ Auto-ocultar sidebar tras 3 segundos
    this.startHideTimer();
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
    this.clearHideTimer();
  }

  // ── Sidebar auto-hide ──────────────────────────
  startHideTimer() {
    this.clearHideTimer();
    this.hideTimer = setTimeout(() => this.sidebarCollapsed.set(true), 3000);
  }

  clearHideTimer() {
    if (this.hideTimer) { clearTimeout(this.hideTimer); this.hideTimer = null; }
  }

  showSidebar() {
    this.sidebarCollapsed.set(false);
    this.clearHideTimer();
  }

  hideSidebarDelayed() {
    this.startHideTimer();
  }

  goOpenShift()  { this.router.navigate(['/pos/open-shift']);  }
  goCloseShift() { this.router.navigate(['/pos/close-shift']); }

  addProduct(p: Producto) { this.posState.addProduct(p); }

  setCustomer(c: Customer | null) {
    this.selectedCustomer.set(c);
    if (c) this.toast.info(`Cliente: ${c.name}`);
  }

  // ✅ Helper tipado para el template — evita "as any" en HTML
  setPaidWith(method: PaidWith): void {
    this.paidWith.set(method);
  }

  onCheckout() {
    if (!this.posState.items().length) {
      this.toast.warning('El carrito está vacío');
      return;
    }
    if (!this.cash()) {
      this.toast.error('No hay caja abierta. Abre una sesión primero.');
      return;
    }
    this.discount.set(0);
    this.saleNotes.set('');
    this.showCheckout.set(true);
  }

  cancelCheckout() { this.showCheckout.set(false); }

  confirmSale() {
    // ✅ Incluye nota por ítem para la orden de cocina
    const items = this.posState.items().map(it => ({
      productId: it.producto._id,
      quantity:  it.qty,
      note:      it.note || ''
    }));

    const disc  = Number(this.discount()) || 0;
    const total = this.posState.total();

    if (disc > total) {
      this.toast.error('El descuento no puede superar el total');
      return;
    }

    this.checkoutLoading.set(true);

    this.api.createSale({
      items,
      paidWith:   this.paidWith(),
      discount:   disc,
      notes:      this.saleNotes(),
      customerId: this.selectedCustomer()?._id
    }).subscribe({
      next: (sale: Sale) => {
        this.checkoutLoading.set(false);
        this.showCheckout.set(false);
        this.lastSaleId.set(sale._id);
        this.posState.clear();
        this.toast.success('🎉 Venta registrada correctamente');
      },
      error: e => {
        this.checkoutLoading.set(false);
        this.toast.error(e?.error?.message || 'Error al registrar la venta');
      }
    });
  }

  openTicket() {
    const id = this.lastSaleId();
    if (!id) return;
    window.open(`${this.api['base']}/sales/${id}/ticket`, '_blank');
  }

  downloadTicket() {
    const id = this.lastSaleId();
    if (!id) return;
    this.api.getSaleTicketPdf(id).subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        const a   = document.createElement('a');
        a.href     = url;
        a.download = `ticket-${id}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        this.toast.success('Ticket descargado');
      },
      error: () => this.toast.error('No se pudo descargar el ticket')
    });
  }

  /** ✅ Descarga el ticket de cocina con token JWT */
  downloadKitchenTicket() {
    const id = this.lastSaleId();
    if (!id) return;
    this.api.getKitchenTicketPdf(id).subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        const a   = document.createElement('a');
        a.href     = url;
        a.download = `cocina-${id}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        this.toast.success('Ticket de cocina descargado');
      },
      error: () => this.toast.error('No se pudo descargar el ticket de cocina')
    });
  }

  dismissTicket() { this.lastSaleId.set(null); }
}