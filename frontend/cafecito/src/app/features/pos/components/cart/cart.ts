import { Component } from '@angular/core';
import { PosStateService } from '../../../../core/state/pos-state.service';

import { CommonModule } from '@angular/common';
@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './cart.html',
  styleUrls: ['./cart.css']
})
export class CartComponent {
  constructor(public pos: PosStateService) {}

  focusIndex(i: number) {
    this.pos.setFocusByIndex(i);
  }

  inc(id: string) { this.pos.inc(id, 1); }
  dec(id: string) { this.pos.inc(id, -1); }
  remove(id: string) { this.pos.setQty(id, 0); }
  directQty(id: string, val: string) {
    const n = parseInt(val, 10);
    if (!Number.isNaN(n)) this.pos.setQty(id, n);
  }
  
editNote(id: string, current: string) {
    const note = prompt('Nota para cocina / preparación:', current || '');
    if (note !== null) this.pos.setNote(id, note.trim());
  }
}

