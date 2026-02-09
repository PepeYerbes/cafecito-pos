import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  standalone: true,
  selector: 'app-login-page',
  imports: [CommonModule, FormsModule],
  templateUrl: './login-page.html',
  styleUrls: ['./login-page.css']
})
export class LoginPageComponent {
  email = signal<string>('');
  password = signal<string>('');
  loading = signal<boolean>(false);
  error = signal<string | null>(null);

  constructor(private auth: AuthService, private router: Router) {}

  submit(e?: Event) {
  if (e) e.preventDefault(); // ✅ evita submit nativo (SSR-safe)

  this.error.set(null);
  this.loading.set(true);

  const email = this.email();
  const password = this.password();

  // Depuración rápida en navegador
  console.log('[Login] email:', email, 'password length:', password?.length);

  if (!email || !password) {
    this.loading.set(false);
    this.error.set('Ingresa email y contraseña');
    return;
  }

  this.auth.login(email, password).subscribe({
    next: (res) => {
      this.auth.setSession(res.token, res.user);
      this.loading.set(false);
      this.router.navigate(['/pos']);
    },
    error: (err) => {
      this.loading.set(false);
      this.error.set(err?.error?.message || 'Credenciales inválidas');
    }
  });
}
}
