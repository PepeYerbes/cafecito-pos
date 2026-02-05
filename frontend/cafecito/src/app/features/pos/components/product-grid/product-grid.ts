import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Producto } from '../../../../core/models/product.model';

import { CommonModule } from '@angular/common';
@Component({
  selector: 'app-product-grid',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './product-grid.html',
  styleUrls: ['./product-grid.css']
})
export class ProductGridComponent {
  @Input() productos: Producto[] = [];
  @Output() add = new EventEmitter<Producto>();
}