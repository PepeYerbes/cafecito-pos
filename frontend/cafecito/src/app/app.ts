import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterOutlet, Router } from '@angular/router';
import { AuthState } from './core/state/auth.state';
import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterOutlet],
  template: `
    <header class="toolbar">
      <div class="brand">
        <span class="t">Cafecito Feliz POS</span>
        <nav class="links">
          <a routerLink="/pos">POS</a>
          <a routerLink="/catalogo">Catálogo</a>
          <a routerLink="/customers" *ngIf="auth.isLoggedIn()">Clientes</a>
          <a routerLink="/config" *ngIf="auth.isAdmin()">Configuración</a>
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
    .toolbar { padding: 12px; background: var(--primary); color: #fff; display:flex; align-items:center; justify-content: space-between; }
    .brand { display:flex; align-items:center; gap: 16px; }
    .links a { color: #fff; margin-right: 10px; text-decoration: none; }
    .container { padding: 16px; }
    .session { display:flex; align-items:center; gap: 10px; }
    .logout { background: var(--accent); color: #fff; border:none; padding: 6px 10px; border-radius: 8px; cursor:pointer; }
    .login { color: #fff; text-decoration: underline; }
  `]
})
export class AppComponent {
  auth = inject(AuthState);
  private authSvc = inject(AuthService);
  private router = inject(Router);

  logout() {
    this.authSvc.logout();
    this.router.navigate(['/login']);
  }
}