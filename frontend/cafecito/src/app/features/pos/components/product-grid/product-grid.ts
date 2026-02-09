import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule, NgFor, NgIf } from '@angular/common';
import { Producto } from '../../../../core/models/product.model';

@Component({
  selector: 'app-product-grid',
  standalone: true,
  // 👇 Importa explícitamente NgFor y NgIf (además de CommonModule)
  imports: [CommonModule, NgFor, NgIf],
  templateUrl: './product-grid.html',
  styleUrls: ['./product-grid.css']
})
export class ProductGridComponent {
  @Input() productos: Producto[] = [];
  @Output() add = new EventEmitter<Producto>();
}
