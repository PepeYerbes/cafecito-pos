
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SearchBarComponent } from '../../components/search-bar/search-bar';
import { PriceRangeComponent } from '../../components/price-range/price-range';
import { ProductCardComponent } from '../../components/product-card/product-card';
import { PaginatorComponent } from '../../components/paginator/paginator';
import { ProductosService } from '../../../../core/services/productos.service';
import { Producto } from '../../../../core/models/product.model';

@Component({
  selector: 'app-catalog-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    SearchBarComponent,
    PriceRangeComponent,
    ProductCardComponent,
    PaginatorComponent
  ],
  templateUrl: './catalog-page.html',
  styleUrls: ['./catalog-page.css']
})
export class CatalogPageComponent implements OnInit {
  productos: Producto[] = [];
  cargando = false;

  // Estado de filtros
  page = 1;
  limit = 8;
  total = 0;
  totalPages = 0;

  q = '';
  categoria = '';
  minPrecio?: number;
  maxPrecio?: number;
  activo: boolean | undefined = true;

  categorias = ['Café', 'Té', 'Frappé', 'Postre', 'Snack', 'Otro'];

  constructor(private productosService: ProductosService) {}

  ngOnInit(): void {
    this.cargar();
  }

  cargar() {
    this.cargando = true;
    this.productosService
      .listar({
        page: this.page, limit: this.limit, q: this.q || undefined,
        categoria: this.categoria || undefined,
        minPrecio: this.minPrecio, maxPrecio: this.maxPrecio,
        activo: this.activo
      })
      .subscribe({
        next: (res) => {
          this.productos = res.data;
          this.total = res.total;
          this.totalPages = res.totalPages;
          this.cargando = false;
        },
        error: (err) => {
          console.error('Error cargando productos', err);
          this.cargando = false;
        }
      });
  }

  onSearch(q: string) { this.q = q; this.page = 1; this.cargar(); }
  onCategoryChange(cat: string) { this.categoria = cat; this.page = 1; this.cargar(); }
  onPriceChange(range: { min?: number; max?: number }) {
    this.minPrecio = range.min; this.maxPrecio = range.max; this.page = 1; this.cargar();
  }
  onPageChange(p: number) { this.page = p; this.cargar(); }
  clearFilters() {
    this.q = ''; this.categoria = ''; this.minPrecio = undefined; this.maxPrecio = undefined; this.activo = true; this.page = 1; this.cargar();
  }
}
