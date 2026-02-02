
import { Component, Input } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { Producto } from '../../../../core/models/product.model';

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [DecimalPipe],
  templateUrl: './product-card.html',
  styleUrls: ['./product-card.css']
})
export class ProductCardComponent {
  @Input() producto!: Producto;
}
``
