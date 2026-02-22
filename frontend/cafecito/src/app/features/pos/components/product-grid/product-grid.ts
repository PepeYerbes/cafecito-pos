// src/app/features/pos/components/product-grid/product-grid.ts
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule, DecimalPipe, NgFor, NgIf } from '@angular/common';
import { Producto } from '../../../../core/models/product.model';

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

  getCategoryIcon(categoria: string): string {
    const map: Record<string, string> = {
      'Café':   '☕',
      'Té':     '🍵',
      'Frappé': '🧋',
      'Postre': '🍰',
      'Snack':  '🥐',
      'Otro':   '🛍️'
    };
    return map[categoria] ?? '🛍️';
  }
}