import { Component, EventEmitter, Output } from '@angular/core';
import { PosStateService } from '../../../../core/state/pos-state.service';

import { CommonModule } from '@angular/common';
@Component({
  selector: 'app-totals',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './totals.html',
  styleUrls: ['./totals.css']
})

export class TotalsComponent {
  @Output() checkout = new EventEmitter<void>();
  @Output() sendToKitchen = new EventEmitter<void>();
  constructor(public pos: PosStateService) {}
}
