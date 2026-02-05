import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class PdfService {
  openBlobInNewTab(blob: Blob) {
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }
}
