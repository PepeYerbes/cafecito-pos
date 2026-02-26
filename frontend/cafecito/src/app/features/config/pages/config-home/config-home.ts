// src/app/features/config/pages/config-home/config-home.ts
import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductosService } from '../../../../core/services/products.service';
import { UsersService, AppUser } from '../../../../core/services/users.service';
import { ToastService } from '../../../../core/services/toast.service';
import { Producto } from '../../../../core/models/product.model';

@Component({
  standalone: true,
  selector: 'app-config-home',
  imports: [CommonModule, FormsModule],
  templateUrl: './config-home.html',
  styleUrls: ['./config-home.css']
})
export class ConfigHomePageComponent implements OnInit {

  // ✅ Usar inject() en lugar de constructor injection
  // (evita el error -992003 de inyección sin token reconocido)
  private productosSvc = inject(ProductosService);
  private usersSvc     = inject(UsersService);
  private toast        = inject(ToastService);

  activeTab: 'products' | 'users' = 'products';

  // ─── Productos ───────────────────────────────────
  productos  = signal<Producto[]>([]);
  pLoading   = signal<boolean>(false);
  pError     = signal<string | null>(null);

  pForm = signal<{
    id?: string;
    nombre: string; codigo: string; precio: number;
    categoria: string; stock: number; activo: boolean;
    taxRate: number; imageFile?: File | null;
  }>({
    nombre: '', codigo: '', precio: 0,
    categoria: 'Otro', stock: 0, activo: true,
    taxRate: 0.16, imageFile: null
  });

  setPNombre(v: string)    { this.pForm.set({ ...this.pForm(), nombre:    v }); }
  setPCodigo(v: string)    { this.pForm.set({ ...this.pForm(), codigo:    v }); }
  setPPrecio(v: number)    { this.pForm.set({ ...this.pForm(), precio:    Number(v) || 0 }); }
  setPCategoria(v: string) { this.pForm.set({ ...this.pForm(), categoria: v }); }
  setPStock(v: number)     { this.pForm.set({ ...this.pForm(), stock:     Number(v) || 0 }); }
  setPActivo(v: boolean)   { this.pForm.set({ ...this.pForm(), activo:    Boolean(v) }); }
  setPTax(v: number)       { this.pForm.set({ ...this.pForm(), taxRate:   Number(v) || 0 }); }
  onPickImage(file: File | null) { this.pForm.set({ ...this.pForm(), imageFile: file }); }

  // ─── Usuarios ────────────────────────────────────
  users    = signal<AppUser[]>([]);
  uLoading = signal<boolean>(false);
  uError   = signal<string | null>(null);

  uForm = signal<{
    id?: string; name: string; email: string;
    password: string; role: 'ADMIN' | 'CASHIER';
  }>({ name: '', email: '', password: '', role: 'CASHIER' });

  setUName(v: string)               { this.uForm.set({ ...this.uForm(), name:     v }); }
  setUEmail(v: string)              { this.uForm.set({ ...this.uForm(), email:    v }); }
  setUPass(v: string)               { this.uForm.set({ ...this.uForm(), password: v }); }
  setURole(v: 'ADMIN' | 'CASHIER') { this.uForm.set({ ...this.uForm(), role:     v }); }

  categorias = ['Café', 'Té', 'Frappé', 'Postre', 'Snack', 'Alimentos', 'Bebidas Frias'];

  ngOnInit(): void {
    this.loadProducts();
    this.loadUsers();
  }

  // ════════════════ PRODUCTOS ════════════════

  loadProducts() {
    this.pLoading.set(true);
    this.productosSvc.listar({ page: 1, limit: 100, activo: undefined }).subscribe({
      next: r => { this.productos.set(r.data); this.pLoading.set(false); },
      error: e => {
        const msg = e?.error?.message || 'Error cargando productos';
        this.pError.set(msg);
        this.pLoading.set(false);
        this.toast.error(msg);
      }
    });
  }

  editProduct(p: Producto) {
    this.pForm.set({
      id: p._id, nombre: p.nombre, codigo: p.codigo,
      precio: p.precio, categoria: p.categoria, stock: p.stock,
      activo: p.activo, taxRate: p.taxRate ?? 0.16, imageFile: null
    });
    this.toast.info(`Editando: ${p.nombre}`);
  }

  clearProductForm() {
    this.pForm.set({
      id: undefined, nombre: '', codigo: '', precio: 0,
      categoria: 'Otro', stock: 0, activo: true, taxRate: 0.16, imageFile: null
    });
    this.pError.set(null);
  }

  saveProduct() {
    const f = this.pForm();
    if (!f.nombre.trim() || !f.codigo.trim()) {
      this.toast.warning('Nombre y código son obligatorios');
      return;
    }

    const fd = new FormData();
    fd.set('nombre',    f.nombre);
    fd.set('codigo',    f.codigo);
    fd.set('precio',    String(f.precio));
    fd.set('categoria', f.categoria);
    fd.set('stock',     String(f.stock));
    fd.set('activo',    String(f.activo));
    fd.set('taxRate',   String(f.taxRate));
    if (f.imageFile) fd.set('image', f.imageFile);

    this.pLoading.set(true);
    this.pError.set(null);

    const isEdit = !!f.id;
    const req$ = isEdit
      ? this.productosSvc.actualizar(f.id!, fd as any)
      : this.productosSvc.crear(fd as any);

    req$.subscribe({
      next: (p: any) => {
        this.pLoading.set(false);
        this.clearProductForm();
        this.loadProducts();
        this.toast.success(
          isEdit
            ? `✔ "${p.nombre ?? f.nombre}" actualizado`
            : `✔ "${p.nombre ?? f.nombre}" creado`
        );
      },
      error: e => {
        this.pLoading.set(false);
        const msg = e?.error?.message || 'Error guardando producto';
        this.pError.set(msg);
        this.toast.error(msg);
      }
    });
  }

  deleteProduct(id: string, nombre: string) {
    if (!confirm(`¿Eliminar el producto "${nombre}"?`)) return;
    this.productosSvc.eliminar(id).subscribe({
      next: () => { this.loadProducts(); this.toast.success(`"${nombre}" eliminado`); },
      error: e => {
        const msg = e?.error?.message || 'Error eliminando';
        this.pError.set(msg);
        this.toast.error(msg);
      }
    });
  }

  // ════════════════ USUARIOS ════════════════

  loadUsers() {
    this.uLoading.set(true);
    this.usersSvc.list().subscribe({
      next: items => { this.users.set(items); this.uLoading.set(false); },
      error: e => {
        this.uLoading.set(false);
        const msg = e?.error?.message || 'Error cargando usuarios';
        this.uError.set(msg);
        this.toast.error(msg);
      }
    });
  }

  editUser(u: AppUser) {
    this.uForm.set({ id: u.id, name: u.name, email: u.email, password: '', role: u.role });
    this.toast.info(`Editando usuario: ${u.name}`);
  }

  clearUserForm() {
    this.uForm.set({ id: undefined, name: '', email: '', password: '', role: 'CASHIER' });
    this.uError.set(null);
  }

  saveUser() {
    const f = this.uForm();
    if (!f.name.trim()) { this.toast.warning('El nombre es obligatorio'); return; }
    if (!f.id && !f.email.trim()) { this.toast.warning('El email es obligatorio'); return; }
    if (!f.id && !f.password.trim()) { this.toast.warning('La contraseña es obligatoria'); return; }

    this.uLoading.set(true);
    this.uError.set(null);

    const isEdit = !!f.id;
    const req$ = isEdit
      ? this.usersSvc.update(f.id!, {
          name: f.name,
          role: f.role,
          ...(f.password ? { password: f.password } : {})
        })
      : this.usersSvc.create({ name: f.name, email: f.email, password: f.password, role: f.role });

    req$.subscribe({
      next: (u: any) => {
        this.uLoading.set(false);
        this.clearUserForm();
        this.loadUsers();
        this.toast.success(
          isEdit
            ? `✔ Usuario "${u.name}" actualizado`
            : `✔ Usuario "${u.name}" creado`
        );
      },
      error: e => {
        this.uLoading.set(false);
        const msg = e?.error?.message || 'Error guardando usuario';
        this.uError.set(msg);
        this.toast.error(msg);
      }
    });
  }

  deleteUser(id: string, name: string) {
    if (!confirm(`¿Eliminar al usuario "${name}"?`)) return;
    this.usersSvc.remove(id).subscribe({
      next: () => { this.loadUsers(); this.toast.success(`Usuario "${name}" eliminado`); },
      error: e => {
        const msg = e?.error?.message || 'Error eliminando usuario';
        this.uError.set(msg);
        this.toast.error(msg);
      }
    });
  }

  getCategoryIcon(cat: string): string {
    const map: Record<string, string> = {
      'Café': '☕', 'Té': '🍵', 'Frappé': '🍦',
      'Postre': '🍰', 'Snack': '🥐', 'Alimentos': '🥞', 'Bebidas Frias': '🧊'
    };
    return map[cat] ?? '🛍️';
  }
}