
import { Component, EventEmitter, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-search-bar',
  standalone: true,
  imports: [FormsModule],
  template: `
    <input
      type="search"
      placeholder="Buscar por nombre…"
      [(ngModel)]="term"
      (keyup.enter)="emit()"
    />
    <button (click)="emit()">Buscar</button>
  `
})
export class SearchBarComponent {
  term = '';
  @Output() search = new EventEmitter<string>();
  emit() { this.search.emit(this.term.trim()); }
}
