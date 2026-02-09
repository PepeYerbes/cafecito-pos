import { Component, EventEmitter, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CustomersService, Customer } from '../../../../core/services/customers.service';

@Component({
  standalone: true,
  selector: 'app-customer-picker',
  imports: [CommonModule, FormsModule],
  templateUrl: './customer-picker.html',
  styleUrls: ['./customer-picker.css']
})
export class CustomerPickerComponent {
  q = signal<string>('');
  results = signal<Customer[]>([]);
  loading = signal<boolean>(false);
  selected = signal<Customer | null>(null);

  @Output() select = new EventEmitter<Customer | null>();

  constructor(private svc: CustomersService) {}

  search() {
    this.loading.set(true);
    this.svc.list({ q: this.q() || undefined, page: 1, limit: 10 }).subscribe({
      next: (r) => { this.results.set(r.data); this.loading.set(false); },
      error: () => { this.results.set([]); this.loading.set(false); }
    });
  }

  pick(c: Customer) {
    this.selected.set(c);
    this.select.emit(c);
  }

  clear() {
    this.selected.set(null);
    this.select.emit(null);
  }
}
