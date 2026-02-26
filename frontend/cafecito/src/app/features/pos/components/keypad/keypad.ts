// src/app/features/pos/components/keypad/keypad.ts
import { Component } from '@angular/core';
import { PosStateService } from '../../../../core/state/pos-state.service';

@Component({
  selector: 'app-keypad',
  standalone: true,  // ✅ FIX: faltaba standalone:true
  imports: [],
  templateUrl: './keypad.html',
  styleUrls: ['./keypad.css']
})
export class KeypadComponent {
  buffer = '';

  constructor(public pos: PosStateService) {}

  press(n: string) {
    if (n === 'C') {
      this.buffer = '';
    } else if (n === '←') {
      this.buffer = this.buffer.slice(0, -1);
    } else if (this.buffer.length < 6) {
      this.buffer += n;
    }
  }

  apply() {
    const value = parseInt(this.buffer, 10);
    if (!Number.isNaN(value) && value >= 0) {
      this.pos.applyKeypadValue(value);
    }
    this.buffer = '';
  }
}