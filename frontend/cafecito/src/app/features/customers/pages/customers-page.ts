// src/app/features/customers/pages/customers-page.ts
import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CustomersService, Customer } from '../../../core/services/customers.service';
import { ToastService } from '../../../core/services/toast.service';
type CustomersListResponse = {
  data: Customer[]; page: number; limit: number;
  total: number; totalPages: number;
};

@Component({
  standalone: true,
  selector: 'app-customers-page',
  imports: [CommonModule, FormsModule],
  templateUrl: './customers-page.html',
  styleUrls: ['./customers-page.css']
})
export class CustomersPageComponent implements OnInit {
  q      = signal<string>('');
  items  = signal<Customer[]>([]);
  page   = signal<number>(1);
  pages  = signal<number>(1);
  loading = signal<boolean>(false);
  error   = signal<string | null>(null);

  form = signal<Partial<Customer> & { _id?: string }>({
    name: '', phone: '', email: '', birthdate: '', notes: ''
  });

  pointsToRedeem = signal<number>(0);

  constructor(private svc: CustomersService, private toast: ToastService) {}

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
        const msg = e?.error?.message || 'Error cargando clientes';
        this.error.set(msg);
        this.loading.set(false);
        this.toast.error(msg);
      }
    });
  }

  search() { this.page.set(1); this.load(); }
  go(p: number) { if (p < 1 || p > this.pages()) return; this.page.set(p); this.load(); }

  edit(c: Customer) {
    this.form.set({ _id: c._id, name: c.name, phone: c.phone, email: c.email, birthdate: c.birthdate, notes: c.notes });
    this.toast.info(`Editando: ${c.name}`);
  }
  clear() { this.form.set({ _id: undefined, name: '', phone: '', email: '', birthdate: '', notes: '' }); }

  setFormName(v: string)      { this.form.set({ ...this.form(), name:      v }); }
  setFormPhone(v: string)     { this.form.set({ ...this.form(), phone:     v }); }
  setFormEmail(v: string)     { this.form.set({ ...this.form(), email:     v }); }
  setFormBirthdate(v: string) { this.form.set({ ...this.form(), birthdate: v }); }
  setFormNotes(v: string)     { this.form.set({ ...this.form(), notes:     v }); }

  save() {
    const f = this.form();
    if (!f.name || !f.name.trim()) { this.toast.warning('El nombre es obligatorio'); return; }

    const isEdit = !!f._id;
    const req$   = isEdit ? this.svc.update(f._id!, f) : this.svc.create(f);

    req$.subscribe({
      next: (c: any) => {
        this.clear();
        this.load();
        this.toast.success(
          isEdit
            ? `✔ Cliente "${c.name}" actualizado`
            : `✔ Cliente "${c.name}" registrado`
        );
      },
      error: (e: any) => {
        const msg = e?.error?.message || 'Error guardando cliente';
        this.error.set(msg);
        this.toast.error(msg);
      }
    });
  }

  remove(id: string, name: string) {
    if (!confirm(`¿Eliminar al cliente "${name}"?`)) return;
    this.svc.remove(id).subscribe({
      next: () => {
        this.load();
        this.toast.success(`Cliente "${name}" eliminado`);
      },
      error: (e: any) => {
        const msg = e?.error?.message || 'Error eliminando cliente';
        this.error.set(msg);
        this.toast.error(msg);
      }
    });
  }

  redeem(c: Customer) {
    const p = Number(this.pointsToRedeem());
    if (!p || p <= 0) { this.toast.warning('Ingresa una cantidad de puntos válida'); return; }
    if ((c.points || 0) < p) { this.toast.error(`El cliente solo tiene ${c.points || 0} puntos`); return; }

    this.svc.redeem(c._id, p).subscribe({
      next: () => {
        this.pointsToRedeem.set(0);
        this.load();
        this.toast.success(`${p} puntos canjeados para ${c.name}`);
      },
      error: (e: any) => this.toast.error(e?.error?.message || 'Error canjeando puntos')
    });
  }
}