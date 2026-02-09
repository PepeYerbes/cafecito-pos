import { Injectable, computed, signal, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'CASHIER';
}
export interface AuthSnapshot {
  token: string;
  user: AuthUser;
}

@Injectable({ providedIn: 'root' })
export class AuthState {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  private readonly _token = signal<string | null>(null);
  private readonly _user = signal<AuthUser | null>(null);

  readonly token = computed(() => this._token());
  readonly user = computed(() => this._user());
  readonly isLoggedIn = computed(() => !!this._token() && !!this._user());
  readonly isAdmin = computed(() => this._user()?.role === 'ADMIN');

  constructor() {
    // ✅ Solo lee localStorage en navegador
    if (this.isBrowser) {
      const raw = localStorage.getItem('auth');
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as AuthSnapshot;
          this._token.set(parsed.token || null);
          this._user.set(parsed.user || null);
        } catch {}
      }
    }
  }

  setAuth(token: string, user: AuthUser) {
    this._token.set(token);
    this._user.set(user);
    if (this.isBrowser) {
      localStorage.setItem('auth', JSON.stringify({ token, user }));
    }
  }

  clear() {
    this._token.set(null);
    this._user.set(null);
    if (this.isBrowser) {
      localStorage.removeItem('auth');
    }
  }
}