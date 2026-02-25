import mongoose from 'mongoose';

const ProductSchema = new mongoose.Schema({
  name:      { type: String, required: true, alias: 'nombre' },
  sku:       { type: String, index: true, unique: true, alias: 'codigo' },
  price:     { type: Number, required: true, alias: 'precio' },
  taxRate:   { type: Number, default: 0.16 },
  stock:     { type: Number, default: 0 },
  active:    { type: Boolean, default: true, alias: 'activo' },
  categoria: { type: String, enum: ['Café', 'Té', 'Frappé', 'Postre', 'Snack', 'Alimentos','Bebidas Frias'], default: 'Café' },
  imageUrl:  { type: String, default: '' }
}, { timestamps: true });

export default mongoose.model('Product', ProductSchema);