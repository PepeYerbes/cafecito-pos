// frontend/cafecito/src/app/features/pos/pages/checkout/checkout.ts
import { Component, OnInit, signal, computed, Signal } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { PosStateService } from '../../../../core/state/pos-state.service';
import { PosApiService } from '../../../../core/services/pos-api.service';
import { PaidWith } from '../../../../core/models/sale.model';

@Component({
  standalone: true,
  selector: 'app-checkout-page',
  imports: [CommonModule, FormsModule, RouterLink, CurrencyPipe],
  templateUrl: './checkout.html',
  styleUrls: ['./checkout.css']
})
export class CheckoutPageComponent implements OnInit {
  // Métodos de pago soportados
  methods: PaidWith[] = ['CASH', 'CARD', 'MIXED', 'TRANSFER'];

  // Estado del formulario
  paidWith = signal<PaidWith>('CASH');
  discount = signal<number>(0);
  notes = signal<string>('');
  loading = signal<boolean>(false);
  error = signal<string | null>(null);
  customerId = signal<string | undefined>(undefined);

  // ⛑️ Declaramos las señales/computed SIN inicializarlas aquí
  // para poder asignarlas en el constructor, cuando `pos` ya existe.
  subtotal!: Signal<number>;
  taxes!: Signal<number>;
  totalBeforeDiscount!: Signal<number>;
  total!: Signal<number>;

  constructor(
    public pos: PosStateService,
    private api: PosApiService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    // ✅ Inicializamos AHORA que `pos` ya está inyectado
    this.subtotal = this.pos.subtotal;
    this.taxes = this.pos.taxes;
    this.totalBeforeDiscount = computed(() => this.subtotal() + this.taxes());
    this.total = computed(() =>
      Math.max(0, this.totalBeforeDiscount() - (this.discount() || 0))
    );
  }

  ngOnInit(): void {
    const cid = this.route.snapshot.queryParamMap.get('customerId') || undefined;
    this.customerId.set(cid);
  }

  pay() {
    this.error.set(null);
    if (!this.pos.items().length) {
      this.error.set('No hay artículos en el carrito');
      return;
    }
    const d = Number(this.discount() || 0);
    if (d < 0) {
      this.error.set('Descuento inválido (≥ 0)');
      return;
    }
    if (d > this.totalBeforeDiscount()) {
      this.error.set('Descuento no puede superar el total');
      return;
    }

    this.loading.set(true);
    const payload = {
      items: this.pos.toSaleItems(),
      paidWith: this.paidWith(),
      discount: d,
      notes: this.notes() || '',
      customerId: this.customerId()
    };

    this.api.createSale(payload).subscribe({
      next: () => {
        this.loading.set(false);
        alert('Venta registrada');
        this.pos.clear();
        this.router.navigate(['/pos']);
      },
      error: (e) => {
        this.loading.set(false);
        const msg = e?.error?.error || e?.error?.message || 'Error registrando venta';
        const details = e?.error?.details;
        this.error.set(
          details
            ? `${msg}\n${details.map((d: any) => d.message || JSON.stringify(d)).join('\n')}`
            : msg
        );
      }
    });
  }
}