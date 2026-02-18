// backend/src/models/Sale.js
import mongoose from 'mongoose';

const { Schema, model, models, Types } = mongoose;

const SaleItemSchema = new Schema(
  {
    product_id: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    product_name: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unit_price: { type: Number, required: true, min: 0 },
    line_total: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const SaleSchema = new Schema(
  {
    customer_id: { type: Schema.Types.ObjectId, ref: 'Customer', default: null },
    payment_method: { type: String, enum: ['cash', 'card', 'transfer'], default: 'cash' },
    items: { type: [SaleItemSchema], required: true, validate: v => Array.isArray(v) && v.length > 0 },
    subtotal: { type: Number, required: true, min: 0 },
    discount_percent: { type: Number, required: true, min: 0 },
    discount_amount: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },
    created_at: { type: Date, default: () => new Date() },
  },
  { versionKey: false }
);

const Sale = models.Sale || model('Sale', SaleSchema);
export default Sale;