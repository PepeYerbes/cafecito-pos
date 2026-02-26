// src/app/core/state/pos-state.service.ts
import { Injectable, signal, computed } from '@angular/core';
import { Subject } from 'rxjs';
import { Producto } from '../models/product.model';

export interface CartItem {
  producto: Producto;
  qty: number;
  note?: string;
}

export type CartEvent =
  | { type: 'added';       name: string; qty: number }
  | { type: 'removed';     name: string }
  | { type: 'qty';         name: string; qty: number }
  | { type: 'cleared' }
  | { type: 'stock_limit'; name: string; stock: number };

@Injectable({ providedIn: 'root' })
export class PosStateService {
  private readonly _items   = signal<CartItem[]>([]);
  private readonly _focused = signal<CartItem | null>(null);

  /** Emite eventos de cambio en el carrito para mostrar toasts */
  readonly cartEvents$ = new Subject<CartEvent>();

  readonly items      = computed(() => this._items());
  readonly focused    = computed(() => this._focused());
  readonly totalItems = computed(() => this._items().reduce((a, i) => a + i.qty, 0));

  private readonly DEFAULT_TAX = 0.16;

  readonly subtotal = computed(() =>
    this._items().reduce((acc, it) => acc + it.producto.precio * it.qty, 0)
  );

  readonly taxes = computed(() =>
    this._items().reduce((acc, it) => {
      const rate = it.producto.taxRate ?? this.DEFAULT_TAX;
      return acc + it.producto.precio * it.qty * rate;
    }, 0)
  );

  readonly total = computed(() => this.subtotal() + this.taxes());

  clear() {
    const had = this._items().length > 0;
    this._items.set([]);
    this._focused.set(null);
    if (had) this.cartEvents$.next({ type: 'cleared' });
  }

  /** ✅ Vacía el carrito sin emitir toast — usado al cargar nueva venta */
  clearSilent() {
    this._items.set([]);
    this._focused.set(null);
  }

  setFocusByIndex(index: number) {
    this._focused.set(this._items()[index] ?? null);
  }

  addProduct(p: Producto) {
    const arr   = [...this._items()];
    const idx   = arr.findIndex(i => i.producto._id === p._id);
    const isNew = idx < 0;

    if (idx >= 0) {
      // ✅ Validar stock antes de incrementar
      const currentQty = arr[idx].qty;
      if (currentQty >= p.stock) {
        this.cartEvents$.next({ type: 'stock_limit', name: p.nombre, stock: p.stock });
        return;
      }
      arr[idx] = { ...arr[idx], qty: currentQty + 1 };
    } else {
      arr.push({ producto: p, qty: 1 });
    }

    this._items.set(arr);
    this._focused.set(arr[isNew ? arr.length - 1 : idx]);
    this.cartEvents$.next({ type: 'added', name: p.nombre, qty: isNew ? 1 : arr[idx].qty });
  }

  removeProduct(productId: string) {
    const removed = this._items().find(i => i.producto._id === productId);
    const arr     = this._items().filter(i => i.producto._id !== productId);
    this._items.set(arr);

    if (this._focused()?.producto._id === productId) {
      this._focused.set(arr.length ? arr[arr.length - 1] : null);
    }
    if (removed) {
      this.cartEvents$.next({ type: 'removed', name: removed.producto.nombre });
    }
  }

  setQty(productId: string, qty: number) {
    if (qty < 0) qty = 0;
    const arr = [...this._items()];
    const idx = arr.findIndex(i => i.producto._id === productId);

    if (idx >= 0) {
      const name = arr[idx].producto.nombre;
      if (qty === 0) {
        arr.splice(idx, 1);
        this.cartEvents$.next({ type: 'removed', name });
      } else {
        arr[idx] = { ...arr[idx], qty };
        this.cartEvents$.next({ type: 'qty', name, qty });
      }
      this._items.set(arr);
      if (!arr.length) this._focused.set(null);
    }
  }

  /** ✅ Actualiza la nota de un ítem — requerido por cart.ts */
  setNote(productId: string, note: string) {
    const arr = [...this._items()];
    const idx = arr.findIndex(i => i.producto._id === productId);
    if (idx >= 0) {
      arr[idx] = { ...arr[idx], note };
      this._items.set(arr);
    }
  }

  inc(productId: string, delta = 1) {
    const arr = [...this._items()];
    const idx = arr.findIndex(i => i.producto._id === productId);
    if (idx >= 0) {
      const item   = arr[idx];
      const newQty = Math.max(0, item.qty + delta);
      const name   = item.producto.nombre;

      // ✅ Validar stock al incrementar
      if (delta > 0 && newQty > item.producto.stock) {
        this.cartEvents$.next({ type: 'stock_limit', name, stock: item.producto.stock });
        return;
      }

      if (newQty === 0) {
        arr.splice(idx, 1);
        this.cartEvents$.next({ type: 'removed', name });
      } else {
        arr[idx] = { ...arr[idx], qty: newQty };
        this.cartEvents$.next({ type: 'qty', name, qty: newQty });
      }
      this._items.set(arr);
    }
  }

  applyKeypadValue(value: number) {
    const f = this._focused();
    if (!f) return;
    this.setQty(f.producto._id, value);
  }

  /**
   * ✅ Convierte ítems del carrito al formato del endpoint POST /sales
   * Requerido por checkout.ts: this.pos.toSaleItems()
   */
  toSaleItems(): { productId: string; quantity: number }[] {
    return this._items().map(it => ({
      productId: it.producto._id,
      quantity:  it.qty
    }));
  }
}