
import { Routes } from '@angular/router';

export const APP_ROUTES: Routes = [
  { path: '', redirectTo: 'catalogo', pathMatch: 'full' },
  {
    path: 'catalogo',
    loadChildren: () =>
      import('./features/catalog/catalog.module').then(m => m.CatalogModule)
  },
  { path: '**', redirectTo: 'catalogo' }
];
