
import { Component, EventEmitter, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-price-range',
  standalone: true,
  imports: [FormsModule],
  template: `
    <label>Precio min:
      <input type="number" min="0" [(ngModel)]="min" (change)="emit()"/>
    </label>
    <label>Precio max:
      <input type="number" min="0" [(ngModel)]="max" (change)="emit()"/>
    </label>
  `
})
export class PriceRangeComponent {
  min?: number;
  max?: number;
  @Output() changeRange = new EventEmitter<{min?: number; max?: number}>();
  emit() { this.changeRange.emit({ min: this.min, max: this.max }); }
}
