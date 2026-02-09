import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// ✅ Ruta correcta al servicio (verifica que el archivo exista)
import { CustomersService, Customer } from '../../../core/services/customers.service';

type CustomersListResponse = {
  data: Customer[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

@Component({
  standalone: true,
  selector: 'app-customers-page',
  imports: [CommonModule, FormsModule],
  templateUrl: './customers-page.html',
  styleUrls: ['./customers-page.css']
})
export class CustomersPageComponent implements OnInit {
  q = signal<string>('');
  items = signal<Customer[]>([]);
  page = signal<number>(1);
  pages = signal<number>(1);
  loading = signal<boolean>(false);
  error = signal<string | null>(null);

  // ✅ define shape amigable al template (evitamos spread en el template)
  form = signal<Partial<Customer> & { _id?: string }>({
    name: '',
    phone: '',
    email: '',
    birthdate: '',
    notes: ''
  });
  pointsToRedeem = signal<number>(0);

  constructor(private svc: CustomersService) {}

  ngOnInit(): void { this.load(); }

  load() {
    this.loading.set(true);
    this.error.set(null);
    this.svc.list({ q: this.q() || undefined, page: this.page(), limit: 12 }).subscribe({
      next: (r: CustomersListResponse) => {
        this.items.set(r.data);
        this.pages.set(r.totalPages || 1);
        this.loading.set(false);
      },
      error: (e: any) => {
        this.error.set(e?.error?.message || 'Error cargando clientes');
        this.loading.set(false);
      }
    });
  }

  search() { this.page.set(1); this.load(); }
  go(p: number) { if (p < 1 || p > this.pages()) return; this.page.set(p); this.load(); }

  edit(c: Customer) {
    this.form.set({ _id: c._id, name: c.name, phone: c.phone, email: c.email, birthdate: c.birthdate, notes: c.notes });
  }
  clear() { this.form.set({ _id: undefined, name: '', phone: '', email: '', birthdate: '', notes: '' }); }

  // ✅ Setters para evitar spread en el template
  setFormName(v: string)  { this.form.set({ ...this.form(), name:  v }); }
  setFormPhone(v: string) { this.form.set({ ...this.form(), phone: v }); }
  setFormEmail(v: string) { this.form.set({ ...this.form(), email: v }); }
  setFormBirthdate(v: string) { this.form.set({ ...this.form(), birthdate: v }); }
  setFormNotes(v: string) { this.form.set({ ...this.form(), notes: v }); }

  save() {
    const f = this.form();
    if (!f.name || !f.name.trim()) { this.error.set('Nombre requerido'); return; }
    const req$ = f._id ? this.svc.update(f._id, f) : this.svc.create(f);
    req$.subscribe({
      next: (_: any) => { this.clear(); this.load(); },
      error: (e: any) => this.error.set(e?.error?.message || 'Error guardando')
    });
  }

  remove(id: string) {
    if (!confirm('¿Eliminar cliente?')) return;
    this.svc.remove(id).subscribe({ next: (_: any) => this.load() });
  }

  redeem(c: Customer) {
    const p = Number(this.pointsToRedeem());
    if (!p || p <= 0) return;
    this.svc.redeem(c._id, p).subscribe({
      next: (_: any) => { this.pointsToRedeem.set(0); this.load(); },
      error: (e: any) => this.error.set(e?.error?.message || 'Error canjeando puntos')
    });
  }
}