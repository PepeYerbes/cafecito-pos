import { Component, OnInit, signal } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { PosApiService } from '../../../../core/services/pos-api.service';

type PaymentSummary = { method: 'CASH'|'CARD'|'MIXED'; total: number; count: number };

@Component({
  selector: 'app-shift-history',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, CurrencyPipe, DatePipe],
  templateUrl: './shift-history.html',
  styleUrls: ['./shift-history.css']
})
export class ShiftHistoryPage implements OnInit {
  items = signal<any[]>([]);
  total = signal<number>(0);
  page = signal<number>(1);
  pageSize = signal<number>(10);
  pages = signal<number>(1);
  loading = signal<boolean>(true);
  error = signal<string | null>(null);

  from = signal<string | undefined>(undefined);
  to = signal<string | undefined>(undefined);

  constructor(private api: PosApiService) {}

  ngOnInit(): void { this.load(); }

  load() {
    this.loading.set(true);
    this.error.set(null);
    this.api.getCloseHistory({
      page: this.page(),
      pageSize: this.pageSize(),
      from: this.from(),
      to: this.to()
    }).subscribe({
      next: (r) => {
        this.items.set(r.items || []);
        this.total.set(r.total || 0);
        const pages = Math.max(1, Math.ceil((r.total || 0) / this.pageSize()));
        this.pages.set(pages);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.message || 'No se pudo cargar el historial');
        this.loading.set(false);
      }
    });
  }

  buscar(e: Event) { e.preventDefault(); this.page.set(1); this.load(); }
  go(p: number) { if (p < 1 || p > this.pages()) return; this.page.set(p); this.load(); }

  // 🔹 Helpers seguros para el template
  paymentTotal(s: any, method: 'CASH'|'CARD'|'MIXED'): number {
    const arr: PaymentSummary[] = s?.payments || [];
    const row = arr.find(p => p?.method === method);
    return row?.total ?? 0;
  }

  paymentCount(s: any, method: 'CASH'|'CARD'|'MIXED'): number {
    const arr: PaymentSummary[] = s?.payments || [];
    const row = arr.find(p => p?.method === method);
    return row?.count ?? 0;
  }
}