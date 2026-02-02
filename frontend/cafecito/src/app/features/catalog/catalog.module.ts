
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CATALOG_ROUTES } from './catalog.routes';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

import { CatalogPageComponent } from './pages/catalog-page/catalog-page';
import { ProductCardComponent } from './components/product-card/product-card';
import { SearchBarComponent } from './components/search-bar/search-bar';
import { PriceRangeComponent } from './components/price-range/price-range';
import { PaginatorComponent } from './components/paginator/paginator';

@NgModule({
  declarations: [
  ],
  imports: [
    CommonModule,
    FormsModule,
    HttpClientModule,
    RouterModule.forChild(CATALOG_ROUTES),
    CatalogPageComponent,
    ProductCardComponent,
    SearchBarComponent,
    PriceRangeComponent,
    PaginatorComponent
  ]
})
export class CatalogModule {}
