import { Component, OnInit, signal } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { PosApiService } from '../../../../../core/services/pos-api.service';
import { CashSession } from '../../../../../core/models/cash.model';

type MovementTypeUI = 'INGRESO' | 'EGRESO' | 'IN' | 'OUT';

@Component({
  selector: 'app-close-shift',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, CurrencyPipe, DatePipe],
  templateUrl: './close-shift.html',
  styleUrls: ['./close-shift.css']
})
export class CloseShiftPage implements OnInit {
  shift = signal<CashSession | null>(null);
  countedCash = signal<number>(0);
  notes = signal<string>('');
  loading = signal<boolean>(true);
  error = signal<string | null>(null);

  // Movimiento nuevo
  movType = signal<MovementTypeUI>('INGRESO');
  movReason = signal<string>('');
  movAmount = signal<number>(0);
  movLoading = signal<boolean>(false);
  movError = signal<string | null>(null);

  constructor(private api: PosApiService, private router: Router) {}

  ngOnInit(): void {
    this.api.getCurrentCash().subscribe({
      next: s => {
        this.shift.set(s);
        this.loading.set(false);
      },
      error: err => {
        this.loading.set(false);
        this.error.set('No hay sesión abierta. Abre una nueva sesión.');
      }
    });
  }

  addMovement() {
    this.movError.set(null);
    const amt = Number(this.movAmount());
    if (Number.isNaN(amt) || amt <= 0) {
      this.movError.set('Ingresa un monto válido (> 0).');
      return;
    }
    this.movLoading.set(true);

    // Mapeo: 'IN'|'OUT' -> 'INGRESO'|'EGRESO'
    const type = this.movType();
    const mapped = type === 'IN' ? 'INGRESO' : type === 'OUT' ? 'EGRESO' : type;

    this.api.addCashMovement(mapped, amt, this.movReason()).subscribe({
      next: s => {
        this.shift.set(s);
        this.movLoading.set(false);
        // limpiar formulario
        this.movAmount.set(0);
        this.movReason.set('');
      },
      error: err => {
        this.movLoading.set(false);
        this.movError.set(err?.error?.message || 'Error al registrar movimiento');
      }
    });
  }

  close() {
    this.error.set(null);
    const val = Number(this.countedCash());
    if (Number.isNaN(val) || val < 0) {
      this.error.set('Ingresa el monto contado (≥ 0).');
      return;
    }
    this.api.closeCash(val, this.notes()).subscribe({
      next: (s) => {
        // redirigir al detalle del cierre
        this.router.navigate(['/pos/shift-detail', s._id]);
      },
      error: err => {
        this.error.set(err?.error?.message || 'Error al cerrar caja');
      }
    });
  }
}