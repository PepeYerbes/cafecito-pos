
export interface Producto {
  _id: string;
  nombre: string;
  precio: number;
  categoria: 'Café' | 'Té' | 'Frappé' | 'Postre' | 'Snack' | 'Otro';
  codigo: string;
  stock: number;
  activo: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductosResponse {
  data: Producto[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
