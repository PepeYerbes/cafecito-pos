import { Component, signal } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { PosApiService } from '../../../../../core/services/pos-api.service';
@Component({
  selector: 'app-open-shift',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, CurrencyPipe],
  templateUrl: './open-shift.html',
  styleUrls: ['./open-shift.css']
})
export class OpenShiftPage {
  initialCash = signal<number>(0);
  loading = signal<boolean>(false);
  error = signal<string | null>(null);

  constructor(private api: PosApiService, private router: Router) {}

  open() {
    this.error.set(null);
    const value = Number(this.initialCash());
    if (Number.isNaN(value) || value < 0) {
      this.error.set('Ingresa un monto inicial válido (≥ 0).');
      return;
    }

    this.loading.set(true);
    this.api.openCash(value).subscribe({
      next: _ => {
        this.loading.set(false);
        this.router.navigate(['/pos/close-shift']);
      },
      error: err => {
        this.loading.set(false);
        this.error.set(err?.error?.message || 'Error al abrir la caja');
      }
    });
  }
}