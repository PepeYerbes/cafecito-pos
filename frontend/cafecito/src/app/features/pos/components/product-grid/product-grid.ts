// src/app/features/pos/components/product-grid/product-grid.ts
import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule, DecimalPipe, NgFor, NgIf } from '@angular/common';
import { Producto } from '../../../../core/models/product.model';
import { ToastService } from '../../../../core/services/toast.service';

@Component({
  selector: 'app-product-grid',
  standalone: true,
  imports: [CommonModule, NgFor, NgIf, DecimalPipe],
  templateUrl: './product-grid.html',
  styleUrls: ['./product-grid.css']
})
export class ProductGridComponent {
  @Input() productos: Producto[] = [];
  @Output() add = new EventEmitter<Producto>();

  private toast = inject(ToastService);

  // ✅ Guardia de stock
  tryAdd(p: Producto) {
    if (p.stock === 0) {
      this.toast.error(`"${p.nombre}" está agotado`);
      return;
    }
    this.add.emit(p);
  }

  getCategoryIcon(categoria: string): string {
    const map: Record<string, string> = {
      'Café':          '☕',
      'Té':            '🍵',
      'Frappé':        '🍦',
      'Postre':        '🍰',
      'Snack':         '🥐',
      'Alimentos':     '🥞',
      'Bebidas Frias': '🧊'
    };
    return map[categoria] ?? '🛍️';
  }
}