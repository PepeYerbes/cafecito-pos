// src/app/core/state/cash.store.ts
import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { PosApiService } from '../services/pos-api.service';
import { CashSession } from '../models/cash.model';

@Injectable({ providedIn: 'root' })
export class CashStore {
  private api = inject(PosApiService);

  /** Sesión actual de caja (OPEN) */
  private readonly _currentSession = signal<CashSession | null>(null);
  /** Error de última carga/acción */
  private readonly _error = signal<string | null>(null);
  /** Estado de carga */
  private readonly _loading = signal<boolean>(false);

  /** Selector: sesión actual (readonly) */
  readonly currentSession = computed(() => this._currentSession());
  /** Selector: ¿hay sesión abierta? */
  readonly hasOpenSession = computed(() => !!this._currentSession());
  /** Selector: loading */
  readonly loading = computed(() => this._loading());
  /** Selector: error */
  readonly error = computed(() => this._error());

  constructor() {
    // Efecto inicial: intentar cargar la sesión abierta al crear el store.
    effect(() => {
      this.refresh();
    });
  }

  /** Refrescar estado desde el backend */
  refresh() {
    this._loading.set(true);
    this._error.set(null);
    this.api.getCurrentCash().subscribe({
      next: (s) => { this._currentSession.set(s); this._loading.set(false); },
      error: () => { this._currentSession.set(null); this._loading.set(false); }
    });
  }

  /** Abrir caja y refrescar */
  openCash(initialCash: number) {
    this._loading.set(true);
    this._error.set(null);
    this.api.openCash(initialCash).subscribe({
      next: (s) => { this._currentSession.set(s); this._loading.set(false); },
      error: (err) => {
        this._error.set(err?.error?.message || 'Error al abrir caja');
        this._loading.set(false);
      }
    });
  }

  /** Agregar movimiento a la caja (INGRESO/EGRESO) */
  addMovement(type: 'INGRESO' | 'EGRESO', amount: number, reason?: string) {
    this._loading.set(true);
    this._error.set(null);
    this.api.addCashMovement(type, amount, reason).subscribe({
      next: (s) => { this._currentSession.set(s); this._loading.set(false); },
      error: (err) => {
        this._error.set(err?.error?.message || 'Error al registrar movimiento');
        this._loading.set(false);
      }
    });
  }

  /** Cerrar caja (al cerrar ya no habrá current OPEN, pero puedes redirigir a detalle) */
  closeCash(countedCash: number, notes?: string, onClosed?: (sessionId: string) => void) {
    this._loading.set(true);
    this._error.set(null);
    this.api.closeCash(countedCash, notes).subscribe({
      next: (closed) => {
        // Tras cerrar, no hay sesión OPEN; puedes limpiar o dejar null.
        this._currentSession.set(null);
        this._loading.set(false);
        if (onClosed) onClosed(closed._id);
      },
      error: (err) => {
        this._error.set(err?.error?.message || 'Error al cerrar caja');
        this._loading.set(false);
      }
    });
  }
}