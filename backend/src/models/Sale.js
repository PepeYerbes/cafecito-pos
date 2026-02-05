import mongoose from 'mongoose';

const SaleItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  name: String,
  quantity: { type: Number, required: true },
  unitPrice: { type: Number, required: true },
  taxRate: { type: Number, default: 0.16 },
  subtotal: { type: Number, required: true }, // unitPrice*qty (sin IVA)
  tax: { type: Number, required: true },      // subtotal*taxRate
  total: { type: Number, required: true }     // subtotal+tax (SIN descuento)
}, { _id: false });

const SaleSchema = new mongoose.Schema({
  sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'CashSession', required: true },
  userId: String,

  items: [SaleItemSchema],

  gross: Number,      // suma subtotales (sin IVA)
  taxes: Number,      // suma IVA
  discount: { type: Number, default: 0 },  // ✅ nuevo
  total: Number,      // gross + taxes - discount

  notes: { type: String, default: '' },    // ✅ nuevo

  paidWith: { type: String, enum: ['CASH','CARD','MIXED'], required: true },
  status: {
    type: String,
    enum: ['COMPLETED','CANCELLED','REFUNDED_PARTIAL','REFUNDED_FULL'],
    default: 'COMPLETED'
  },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

export default mongoose.model('Sale', SaleSchema);