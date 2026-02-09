import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AuthState, AuthUser } from '../state/auth.state';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private auth = inject(AuthState);
  private base = `${environment.apiBaseUrl}/auth`;

  login(email: string, password: string) {
    return this.http.post<{ token: string; user: AuthUser }>(`${this.base}/login`, { email, password });
  }

  setSession(token: string, user: AuthUser) {
    this.auth.setAuth(token, user);
  }

  logout() {
    this.auth.clear();
  }
}