import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductosService } from '../../../../core/services/productos.service';
import { UsersService, AppUser } from '../../../../core/services/users.service';
import { Producto } from '../../../../core/models/product.model';

@Component({
  standalone: true,
  selector: 'app-config-home',
  imports: [CommonModule, FormsModule],
  templateUrl: './config-home.html',
  styleUrls: ['./config-home.css']
})
export class ConfigHomePageComponent implements OnInit {
  // Productos
  productos = signal<Producto[]>([]);
  pLoading = signal<boolean>(false);
  pError = signal<string | null>(null);

  pForm = signal<{
    id?: string;
    nombre: string;
    codigo: string;
    precio: number;
    categoria: string;
    stock: number;
    activo: boolean;
    taxRate: number;
    imageFile?: File | null;
  }>({
    nombre: '', codigo: '', precio: 0, categoria: 'Otro', stock: 0, activo: true, taxRate: 0.16, imageFile: null
  });

  // Setters para evitar spread en template
  setPNombre(v: string)  { this.pForm.set({ ...this.pForm(), nombre:  v }); }
  setPCodigo(v: string)  { this.pForm.set({ ...this.pForm(), codigo:  v }); }
  setPPrecio(v: number)  { this.pForm.set({ ...this.pForm(), precio:  Number(v) || 0 }); }
  setPCategoria(v: string){ this.pForm.set({ ...this.pForm(), categoria: v }); }
  setPStock(v: number)   { this.pForm.set({ ...this.pForm(), stock:   Number(v) || 0 }); }
  setPActivo(v: boolean) { this.pForm.set({ ...this.pForm(), activo:  Boolean(v) }); }
  setPTax(v: number)     { this.pForm.set({ ...this.pForm(), taxRate: Number(v) || 0 }); }

  // Usuarios
  users = signal<AppUser[]>([]);
  uLoading = signal<boolean>(false);
  uError = signal<string | null>(null);
  uForm = signal<{ id?: string; name: string; email: string; password: string; role: 'ADMIN'|'CASHIER' }>({
    name: '', email: '', password: '', role: 'CASHIER'
  });
  setUName(v: string)    { this.uForm.set({ ...this.uForm(), name: v }); }
  setUEmail(v: string)   { this.uForm.set({ ...this.uForm(), email: v }); }
  setUPass(v: string)    { this.uForm.set({ ...this.uForm(), password: v }); }
  setURole(v: 'ADMIN'|'CASHIER') { this.uForm.set({ ...this.uForm(), role: v }); }

  categorias = ['Café', 'Té', 'Frappé', 'Postre', 'Snack', 'Otro'];

  constructor(private productosSvc: ProductosService, private usersSvc: UsersService) {}

  ngOnInit(): void {
    this.loadProducts();
    this.loadUsers();
  }

  // ===== Productos =====
  loadProducts() {
    this.pLoading.set(true);
    this.productosSvc.listar({ page: 1, limit: 100, activo: undefined }).subscribe({
      next: (r) => { this.productos.set(r.data); this.pLoading.set(false); },
      error: (e) => { this.pError.set(e?.error?.message || 'Error cargando productos'); this.pLoading.set(false); }
    });
  }
  onPickImage(file: File | null) {
    this.pForm.set({ ...this.pForm(), imageFile: file || null });
  }
  editProduct(p: Producto) {
    this.pForm.set({
      id: p._id,
      nombre: p.nombre,
      codigo: p.codigo,
      precio: p.precio,
      categoria: p.categoria,
      stock: p.stock,
      activo: p.activo,
      taxRate: p.taxRate ?? 0.16,
      imageFile: null
    });
  }
  clearProductForm() {
    this.pForm.set({ id: undefined, nombre: '', codigo: '', precio: 0, categoria: 'Otro', stock: 0, activo: true, taxRate: 0.16, imageFile: null });
  }
  saveProduct() {
    const f = this.pForm();
    const fd = new FormData();
    fd.set('nombre', f.nombre);
    fd.set('codigo', f.codigo);
    fd.set('precio', String(f.precio));
    fd.set('categoria', f.categoria);
    fd.set('stock', String(f.stock));
    fd.set('activo', String(f.activo));
    fd.set('taxRate', String(f.taxRate));
    if (f.imageFile) fd.set('image', f.imageFile);

    this.pLoading.set(true);
    const req$ = f.id
      ? this.productosSvc.actualizar(f.id, fd as any)
      : this.productosSvc.crear(fd as any);
    req$.subscribe({
      next: () => { this.pLoading.set(false); this.clearProductForm(); this.loadProducts(); },
      error: (e) => { this.pLoading.set(false); this.pError.set(e?.error?.message || 'Error guardando producto'); }
    });
  }
  deleteProduct(id: string) {
    if (!confirm('¿Eliminar producto?')) return;
    this.productosSvc.eliminar(id).subscribe({
      next: () => this.loadProducts(),
      error: (e) => this.pError.set(e?.error?.message || 'Error eliminando')
    });
  }

  // ===== Usuarios =====
  loadUsers() {
    this.uLoading.set(true);
    this.usersSvc.list().subscribe({
      next: (items) => { this.users.set(items); this.uLoading.set(false); },
      error: (e) => { this.uLoading.set(false); this.uError.set(e?.error?.message || 'Error cargando usuarios'); }
    });
  }
  editUser(u: AppUser) {
    this.uForm.set({ id: u.id, name: u.name, email: u.email, password: '', role: u.role });
  }
  clearUserForm() {
    this.uForm.set({ id: undefined, name: '', email: '', password: '', role: 'CASHIER' });
  }
  saveUser() {
    const f = this.uForm();
    this.uLoading.set(true);
    const req$ = f.id
      ? this.usersSvc.update(f.id, { name: f.name, role: f.role, ...(f.password ? { password: f.password } : {}) })
      : this.usersSvc.create({ name: f.name, email: f.email, password: f.password, role: f.role });
    req$.subscribe({
      next: () => { this.uLoading.set(false); this.clearUserForm(); this.loadUsers(); },
      error: (e) => { this.uLoading.set(false); this.uError.set(e?.error?.message || 'Error guardando usuario'); }
    });
  }
  deleteUser(id: string) {
    if (!confirm('¿Eliminar usuario?')) return;
    this.usersSvc.remove(id).subscribe({
      next: () => this.loadUsers(),
      error: (e) => this.uError.set(e?.error?.message || 'Error eliminando usuario')
    });
  }
}