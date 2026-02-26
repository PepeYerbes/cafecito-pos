// src/app/core/services/toast.service.ts
import { Injectable, inject } from '@angular/core';
import { MatSnackBar, MatSnackBarConfig } from '@angular/material/snack-bar';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

@Injectable({ providedIn: 'root' })
export class ToastService {
  private snackBar = inject(MatSnackBar);

  private show(message: string, type: ToastType, duration = 5000): void {
    const config: MatSnackBarConfig = {
      duration,
      horizontalPosition: 'right',
      verticalPosition: 'bottom',
      panelClass: [`toast-${type}`]
    };
    this.snackBar.open(message, '✕', config);
  }

  success(message: string, duration = 5000): void {
    this.show(message, 'success', duration);
  }

  error(message: string, duration = 5000): void {
    this.show(message, 'error', duration);
  }

  info(message: string, duration = 5000): void {
    this.show(message, 'info', duration);
  }

  warning(message: string, duration = 5000): void {
    this.show(message, 'warning', duration);
  }
}