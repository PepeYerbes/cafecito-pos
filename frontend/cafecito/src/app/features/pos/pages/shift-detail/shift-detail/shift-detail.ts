import { Component, OnInit, signal } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe, NgClass } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PosApiService } from '../../../../../core/services/pos-api.service';
import { CashSession } from '../../../../../core/models/cash.model';
import { environment } from '../../../../../../environments/environment';

@Component({
  selector: 'app-shift-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, CurrencyPipe, DatePipe, NgClass],
  templateUrl: './shift-detail.html',
  styleUrls: ['./shift-detail.css']
})
export class ShiftDetailPage implements OnInit {
  id = signal<string>('');
  shift = signal<CashSession | null>(null);
  loading = signal<boolean>(true);
  error = signal<string | null>(null);

  constructor(private route: ActivatedRoute, private api: PosApiService) {}

  ngOnInit(): void {
    const id = this.route.snapshot.params['id'];
    this.id.set(id);

    this.api.getCashSession(id).subscribe({
      next: s => { this.shift.set(s); this.loading.set(false); },
      error: err => { this.error.set(err?.error?.message || 'No se pudo obtener el detalle'); this.loading.set(false); }
    });
  }

  open() {
  const id = this.id();
  if (!id) return;
  const base = environment.apiBaseUrl; // '/api' en prod, 'http://localhost:3001/api' en dev
  const url = `${base}/cash/register/${id}/report?format=pdf`;
  window.open(url, '_blank');
}

  download() {
    const id = this.id();
    if (!id) return;
    this.api.downloadCashPdf(id).subscribe(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cierre-${id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }
}