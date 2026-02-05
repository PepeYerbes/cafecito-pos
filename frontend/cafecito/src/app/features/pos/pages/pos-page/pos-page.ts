import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';

import { PosApiService } from '../../../../core/services/pos-api.service';
import { CashSession } from '../../../../core/models/cash.model';

// Tus componentes reales del POS
import { ProductGridComponent } from '../../components/product-grid/product-grid';
import { CartComponent } from '../../components/cart/cart';
import { TotalsComponent } from '../../components/totals/totals';

@Component({
  selector: 'app-pos-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    RouterLinkActive,     // ⬅️ necesario para routerLinkActive y routerLinkActiveOptions
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

  constructor(private api: PosApiService, private router: Router) {}

  ngOnInit(): void {
    this.api.getCurrentCash().subscribe({
      next: (s) => { this.cash.set(s); this.loadingCash.set(false); },
      error: () => { this.cash.set(null); this.loadingCash.set(false); }
    });
  }

  goOpenShift() { this.router.navigate(['/pos/open-shift']); }
  goCloseShift() { this.router.navigate(['/pos/close-shift']); }
}