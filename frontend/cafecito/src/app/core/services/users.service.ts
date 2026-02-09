import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'CASHIER';
}

@Injectable({ providedIn: 'root' })
export class UsersService {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/users`;

  list(all = false) {
    const params = new HttpParams().set('all', String(all));
    return this.http.get<AppUser[]>(this.base, { params });
  }

  create(dto: { name: string; email: string; password: string; role?: 'ADMIN'|'CASHIER' }) {
    return this.http.post<AppUser>(this.base, dto);
  }

  update(id: string, dto: Partial<{ name: string; role: 'ADMIN'|'CASHIER'; password: string }>) {
    return this.http.patch<AppUser>(`${this.base}/${id}`, dto);
  }

  remove(id: string) {
    return this.http.delete<{ ok: boolean; id: string }>(`${this.base}/${id}`);
  }
}