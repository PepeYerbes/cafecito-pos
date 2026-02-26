// src/app/features/pos/pages/shift-history/shift-history.ts
import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { PosApiService } from '../../../../core/services/pos-api.service';
import { ToastService } from '../../../../core/services/toast.service';

type PaymentSummary = { method: 'CASH'|'CARD'|'MIXED'; total: number; count: number };

@Component({
  selector: 'app-shift-history',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, CurrencyPipe, DatePipe],
  templateUrl: './shift-history.html',
  styleUrls: ['./shift-history.css']
})
export class ShiftHistoryPage implements OnInit {
  private api   = inject(PosApiService);
  private toast = inject(ToastService);

  items    = signal<any[]>([]);
  total    = signal<number>(0);
  page     = signal<number>(1);
  pageSize = signal<number>(10);
  pages    = signal<number>(1);
  loading  = signal<boolean>(true);
  error    = signal<string | null>(null);

  from = signal<string | undefined>(undefined);
  to   = signal<string | undefined>(undefined);

  // Track qué PDF está descargando para mostrar estado de carga
  downloadingId = signal<string | null>(null);

  ngOnInit(): void { this.load(); }

  load() {
    this.loading.set(true);
    this.error.set(null);
    this.api.getCloseHistory({
      page:     this.page(),
      pageSize: this.pageSize(),
      from:     this.from(),
      to:       this.to()
    }).subscribe({
      next: r => {
        this.items.set(r.items || []);
        this.total.set(r.total || 0);
        this.pages.set(Math.max(1, Math.ceil((r.total || 0) / this.pageSize())));
        this.loading.set(false);
      },
      error: err => {
        this.error.set(err?.error?.message || 'No se pudo cargar el historial');
        this.loading.set(false);
      }
    });
  }

  buscar(e: Event) { e.preventDefault(); this.page.set(1); this.load(); }
  go(p: number) { if (p < 1 || p > this.pages()) return; this.page.set(p); this.load(); }

  paymentTotal(s: any, method: 'CASH'|'CARD'|'MIXED'): number {
    const arr: PaymentSummary[] = s?.payments || [];
    return arr.find(p => p?.method === method)?.total ?? 0;
  }

  paymentCount(s: any, method: 'CASH'|'CARD'|'MIXED'): number {
    const arr: PaymentSummary[] = s?.payments || [];
    return arr.find(p => p?.method === method)?.count ?? 0;
  }

  /** Nombre del cajero — soporta objeto populado o string plano */
  cashierName(s: any): string {
    if (!s?.cashier) return '—';
    if (typeof s.cashier === 'object') return s.cashier.name || s.cashier.email || '—';
    return String(s.cashier);
  }

  /** ✅ FIX: descarga el PDF con el token JWT adjunto (no window.open) */
  downloadPdf(id: string) {
    if (this.downloadingId()) return;
    this.downloadingId.set(id);

    this.api.downloadCashPdf(id).subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        const a   = document.createElement('a');
        a.href     = url;
        a.download = `cierre-${id}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        this.downloadingId.set(null);
        this.toast.success('PDF descargado');
      },
      error: () => {
        this.downloadingId.set(null);
        this.toast.error('No se pudo descargar el PDF');
      }
    });
  }
}