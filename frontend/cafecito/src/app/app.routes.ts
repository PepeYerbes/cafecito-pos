import { Routes } from '@angular/router';

export const APP_ROUTES: Routes = [
  // Home → POS
  { path: '', redirectTo: 'pos', pathMatch: 'full' },

  // POS principal (tu página actual)
  {
    path: 'pos',
    loadComponent: () =>
      import('./features/pos/pages/pos-page/pos-page')
        .then(m => m.PosPageComponent)
  },

  // --- Caja: abrir, cerrar, detalle de cierre ---
  {
    path: 'pos/open-shift',
    loadComponent: () =>
      import('./features/pos/pages/open-shift/open-shift/open-shift')
        .then(m => m.OpenShiftPage)
  },
  {
    path: 'pos/close-shift',
    loadComponent: () =>
      import('./features/pos/pages/close-shift/close-shift/close-shift')
        .then(m => m.CloseShiftPage)
  },
  {
    path: 'pos/shift-detail/:id',
    loadComponent: () =>
      import('./features/pos/pages/shift-detail/shift-detail/shift-detail')
        .then(m => m.ShiftDetailPage)
  },

// Historial de cierres
  {
    path: 'pos/shift-history',
    loadComponent: () =>
      import('./features/pos/pages/shift-history/shift-history')
        .then(m => m.ShiftHistoryPage)
  },

  // Catálogo (tu componente real)
  {
    path: 'catalogo',
    loadComponent: () =>
      import('./features/catalog/pages/catalog-page/catalog-page')
        .then(m => m.CatalogPageComponent)
  },

  // Catch-all
  { path: '**', redirectTo: 'pos' }
];