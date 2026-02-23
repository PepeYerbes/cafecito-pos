// src/app/app.ts
import { Component, inject, signal, NgZone, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterOutlet, Router } from '@angular/router';
import { AuthState } from './core/state/auth.state';
import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterOutlet],
  template: `
    <!-- ═══════ NAVBAR SUPERIOR ═══════ -->
    <header class="toolbar">
      <div class="brand">
        <!-- ✅ Logo en lugar del texto -->
        <a routerLink="/pos" class="logo-link">
          <img src="assets/logo.png" alt="Cafecito Feliz" class="logo-img"
               onerror="this.style.display='none'; this.nextElementSibling.style.display='inline'" />
          <span class="logo-fallback" style="display:none">☕ Cafecito Feliz</span>
        </a>

        <nav class="links">
          <!-- ✅ "POS" reemplazado por "Inicio" -->
          <a routerLink="/pos">Inicio</a>
          <a routerLink="/catalogo">Catálogo</a>
          <a routerLink="/customers" *ngIf="auth.isLoggedIn()">Clientes</a>
          <a routerLink="/config"    *ngIf="auth.isAdmin()">Configuración</a>
        </nav>
      </div>

      <div class="session" *ngIf="auth.isLoggedIn(); else loginLink">
        <span class="user">{{ auth.user()?.name }} ({{ auth.user()?.role }})</span>
        <button class="logout" (click)="logout()">Salir</button>
      </div>
      <ng-template #loginLink>
        <a routerLink="/login" class="login">Iniciar sesión</a>
      </ng-template>
    </header>

    <main class="container">
      <router-outlet></router-outlet>
    </main>
  `,
  styles: [`
    /* ── Toolbar ── */
    .toolbar {
      padding: 10px 20px;
      background: var(--primary, #432534);
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: space-between;
      position: sticky;
      top: 0;
      z-index: 100;
      box-shadow: 0 2px 8px rgba(0,0,0,0.25);
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 20px;
    }

    /* ── Logo ── */
    .logo-link {
      display: flex;
      align-items: center;
      text-decoration: none;
    }

    .logo-img {
      height: 38px;
      width: auto;
      object-fit: contain;
      display: block;
      /* Suaviza si la imagen tiene fondo blanco */
      border-radius: 6px;
    }

    .logo-fallback {
      font-size: 16px;
      font-weight: 700;
      color: #fff;
      letter-spacing: 0.02em;
    }

    /* ── Nav links ── */
    .links a {
      color: rgba(255,255,255,0.88);
      margin-right: 6px;
      text-decoration: none;
      font-size: 14px;
      font-weight: 500;
      padding: 5px 10px;
      border-radius: 6px;
      transition: background 0.15s, color 0.15s;
    }

    .links a:hover {
      background: rgba(255,255,255,0.15);
      color: #fff;
    }

    /* ── Session ── */
    .session {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .user {
      font-size: 13px;
      opacity: 0.85;
    }

    .logout {
      background: var(--accent, #c44900);
      color: #fff;
      border: none;
      padding: 6px 14px;
      border-radius: 8px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 600;
      transition: opacity 0.15s;
    }
    .logout:hover { opacity: 0.85; }

    .login {
      color: #fff;
      text-decoration: underline;
      font-size: 14px;
    }

    .container {
      /* Sin padding aquí — cada página maneja el suyo */
    }
  `]
})
export class AppComponent {
  auth = inject(AuthState);
  private authSvc = inject(AuthService);
  private router  = inject(Router);

  logout() {
    this.authSvc.logout();
    this.router.navigate(['/login']);
  }
}