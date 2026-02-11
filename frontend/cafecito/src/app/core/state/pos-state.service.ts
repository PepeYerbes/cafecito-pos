import { Injectable, signal, computed } from '@angular/core';
import { Producto } from '../models/product.model';

export interface CartItem {
  producto: Producto;
  qty: number;
  note?: string; // opcional para personalizaciones
}

@Injectable({ providedIn: 'root' })
export class PosStateService {
  // Productos seleccionados (carrito)
  private readonly _items = signal<CartItem[]>([]);
  items = computed(() => this._items());

  // Producto en enfoque (para el keypad)
  private readonly _focused = signal<CartItem | null>(null);
  focused = computed(() => this._focused());

  // Totales (sin IVA por ahora; lo agregamos cuando definamos impuestos)
  subtotal = computed(() =>
    this._items().reduce((acc, it) => acc + it.producto.precio * it.qty, 0)
  );

// IVA default si el producto no trae taxRate
  private readonly DEFAULT_TAX = 0.16;

  // IVA estimado (por línea)
  taxes = computed(() =>
    this._items().reduce((acc, it) => {
      const rate = it.producto.taxRate ?? this.DEFAULT_TAX;
      const lineSubtotal = it.producto.precio * it.qty;
      return acc + (lineSubtotal * rate);
    }, 0)
  );

  // Total estimado (subtotal + IVA)
  total = computed(() => this.subtotal() + this.taxes());

  totalItems = computed(() =>
    this._items().reduce((acc, it) => acc + it.qty, 0)
  );

  clear() {
    this._items.set([]);
    this._focused.set(null);
  }

  setFocusByIndex(index: number) {
    const it = this._items()[index];
    this._focused.set(it ?? null);
  }

  addProduct(p: Producto) {
    const arr = [...this._items()];
    const idx = arr.findIndex(i => i.producto._id === p._id);
    if (idx >= 0) {
      arr[idx] = { ...arr[idx], qty: arr[idx].qty + 1 };
    } else {
      arr.push({ producto: p, qty: 1 });
    }
    this._items.set(arr);
    this._focused.set(arr[arr.length - 1]);
  }

  removeProduct(productId: string) {
    const arr = this._items().filter(i => i.producto._id !== productId);
    this._items.set(arr);
    if (this._focused() && this._focused()!.producto._id === productId) {
      this._focused.set(arr.length ? arr[arr.length - 1] : null);
    }
  }

  setQty(productId: string, qty: number) {
    if (qty < 0) qty = 0;
    const arr = [...this._items()];
    const idx = arr.findIndex(i => i.producto._id === productId);
    if (idx >= 0) {
      if (qty === 0) {
        arr.splice(idx, 1);
      } else {
        arr[idx] = { ...arr[idx], qty };
      }
      this._items.set(arr);
      if (!arr.length) this._focused.set(null);
    }
  }

  inc(productId: string, delta = 1) {
    const arr = [...this._items()];
    const idx = arr.findIndex(i => i.producto._id === productId);
    if (idx >= 0) {
      arr[idx] = { ...arr[idx], qty: Math.max(0, arr[idx].qty + delta) };
      if (arr[idx].qty === 0) arr.splice(idx, 1);
      this._items.set(arr);
    }
  }

  applyKeypadValue(value: number) {
    const f = this._focused();
    if (!f) return;
    this.setQty(f.producto._id, value);
  }

  
// ===== NUEVO: setNote para items
  setNote(productId: string, note: string) {
    const arr = [...this._items()];
    const idx = arr.findIndex(i => i.producto._id === productId);
    if (idx >= 0) {
      arr[idx] = { ...arr[idx], note: note || '' };
      this._items.set(arr);
    }
  }

  // ===== NUEVO: helpers para payloads (orders y sales)
  toOrderItems() {
    return this._items().map(i => ({
      productId: i.producto._id,
      quantity: i.qty,
      note: i.note || ''
    }));
  }

  toSaleItems() {
    return this._items().map(i => ({
      productId: i.producto._id,
      quantity: i.qty
    }));
  }
}
