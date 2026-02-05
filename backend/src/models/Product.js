import mongoose from 'mongoose';

const ProductSchema = new mongoose.Schema({
  name: { type: String, required: true },
  sku: { type: String, index: true, unique: true },
  price: { type: Number, required: true },        // precio unitario sin IVA o con IVA (define tu regla)
  taxRate: { type: Number, default: 0.16 },        // IVA 16% por defecto
  stock: { type: Number, default: 0 },
  active: { type: Boolean, default: true }
}, { timestamps: true });

export default mongoose.model('Product', ProductSchema);