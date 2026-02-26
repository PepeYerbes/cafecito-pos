// backend/src/models/Sale.js
import mongoose from 'mongoose';

const saleItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  name:      { type: String,  required: true },
  quantity:  { type: Number,  required: true, min: 1 },
  unitPrice: { type: Number,  required: true, min: 0 },
  taxRate:   { type: Number,  default: 0.16 },
  subtotal:  { type: Number,  required: true, min: 0 },
  tax:       { type: Number,  required: true, min: 0 },
  total:     { type: Number,  required: true, min: 0 }
}, { _id: false });

const saleSchema = new mongoose.Schema({
  sessionId:  { type: mongoose.Schema.Types.ObjectId, ref: 'CashSession' },
  userId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', default: null },
  items:      { type: [saleItemSchema], required: true,
                validate: v => Array.isArray(v) && v.length > 0 },
  gross:      { type: Number, required: true, min: 0 },
  taxes:      { type: Number, required: true, min: 0 },
  discount:   { type: Number, default: 0, min: 0 },
  total:      { type: Number, required: true, min: 0 },
  paidWith:   { type: String, enum: ['CASH', 'CARD', 'MIXED'], default: 'CASH' },
  notes:      { type: String, default: '' },
  status:     { type: String,
                enum: ['COMPLETED', 'CANCELLED', 'REFUNDED_FULL', 'REFUNDED_PARTIAL'],
                default: 'COMPLETED' }
}, { timestamps: true });

export default mongoose.models.Sale || mongoose.model('Sale', saleSchema);