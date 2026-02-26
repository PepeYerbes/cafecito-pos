import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // 1) Evita prerender en la ruta dinámica con parámetros
  { path: 'pos/shift-detail/:id', renderMode: RenderMode.Server },

  // 2) (Opcional) prerender solo la home si existe como ruta '' en tu app.routes.ts
  { path: '', renderMode: RenderMode.Prerender },

  // 3) Fallback: todo lo demás servido por SSR en runtime (sin prerender)
  { path: '**', renderMode: RenderMode.Server },
];