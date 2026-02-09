import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';
import { AuthState } from '../state/auth.state';

export const authGuard: CanMatchFn = () => {
  const auth = inject(AuthState);
  const router = inject(Router);
  if (auth.isLoggedIn()) return true;
  router.navigate(['/login']);
  return false;
};

export const adminGuard: CanMatchFn = () => {
  const auth = inject(AuthState);
  const router = inject(Router);
  if (auth.isLoggedIn() && auth.isAdmin()) return true;
  router.navigate(['/pos']); // redirige a POS si no es admin
  return false;
};