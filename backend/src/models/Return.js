import mongoose from 'mongoose';

const ReturnItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity: { type: Number, required: true },
  amount: { type: Number, required: true } // total de devolución por ítem (con IVA)
}, { _id: false });

const ReturnSchema = new mongoose.Schema({
  saleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Sale', required: true, index: true },
  sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'CashSession', required: true },
  items: [ReturnItemSchema],
  reason: { type: String, required: true },
  refundAmount: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

export default mongoose.model('Return', ReturnSchema);