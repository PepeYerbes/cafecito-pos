import { Routes } from '@angular/router';
import { authGuard, adminGuard } from './core/guards/auth.guard';

export const APP_ROUTES: Routes = [
  { path: '', redirectTo: 'pos', pathMatch: 'full' },

  // POS principal (protegido)
  {
    path: 'pos',
    canMatch: [authGuard],
    loadComponent: () =>
      import('./features/pos/pages/pos-page/pos-page')
        .then(m => m.PosPageComponent)
  },

  // Caja: abrir, cerrar, detalle de cierre (protegidos)
  {
    path: 'pos/open-shift',
    canMatch: [authGuard],
    loadComponent: () =>
      import('./features/pos/pages/open-shift/open-shift/open-shift')
        .then(m => m.OpenShiftPage)
  },
  {
    path: 'pos/close-shift',
    canMatch: [authGuard],
    loadComponent: () =>
      import('./features/pos/pages/close-shift/close-shift/close-shift')
        .then(m => m.CloseShiftPage)
  },
  {
    path: 'pos/shift-detail/:id',
    canMatch: [authGuard],
    loadComponent: () =>
      import('./features/pos/pages/shift-detail/shift-detail/shift-detail')
        .then(m => m.ShiftDetailPage)
  },
  {
    path: 'pos/shift-history',
    canMatch: [authGuard],
    loadComponent: () =>
      import('./features/pos/pages/shift-history/shift-history')
        .then(m => m.ShiftHistoryPage)
  },

  // Catálogo (público si quieres; aquí lo dejo sin guard)
  {
    path: 'catalogo',
    loadComponent: () =>
      import('./features/catalog/pages/catalog-page/catalog-page')
        .then(m => m.CatalogPageComponent)
  },

  // Login (público)
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/pages/login/login-page')
        .then(m => m.LoginPageComponent)
  },

  // Configuración (ADMIN)
  {
    path: 'config',
    canMatch: [authGuard, adminGuard],
    loadComponent: () =>
      import('./features/config/pages/config-home/config-home')
        .then(m => m.ConfigHomePageComponent)
  },

  // Clientes (CASHIER y ADMIN)
  {
    path: 'customers',
    canMatch: [authGuard],
    loadComponent: () =>
      import('./features/customers/pages/customers-page')
        .then(m => m.CustomersPageComponent)
  },

  { path: '**', redirectTo: 'pos' }
];