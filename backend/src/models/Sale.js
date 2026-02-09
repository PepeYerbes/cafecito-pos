import mongoose from 'mongoose';

const SaleItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  name: String,
  quantity: { type: Number, required: true },
  unitPrice: { type: Number, required: true },
  taxRate: { type: Number, default: 0.16 },
  subtotal: { type: Number, required: true },
  tax: { type: Number, required: true },
  total: { type: Number, required: true }
}, { _id: false });

const SaleSchema = new mongoose.Schema({
  sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'CashSession', required: true },
  userId: String,

  // NEW
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },

  items: [SaleItemSchema],

  gross: Number,
  taxes: Number,
  discount: { type: Number, default: 0 },
  total: Number,

  notes: { type: String, default: '' },

  paidWith: { type: String, enum: ['CASH','CARD','MIXED'], required: true },
  status: {
    type: String,
    enum: ['COMPLETED','CANCELLED','REFUNDED_PARTIAL','REFUNDED_FULL'],
    default: 'COMPLETED'
  },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

export default mongoose.model('Sale', SaleSchema);
``