// backend/src/models/Order.js
import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  name:      { type: String, required: true },
  quantity:  { type: Number, required: true, min: 1 },
  note:      { type: String, default: '' }
}, { _id: false });

const orderSchema = new mongoose.Schema({
  saleId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Sale', required: true },
  sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'CashSession' },
  cashier:   { type: String, default: 'Sistema' },   // nombre del cajero
  items:     { type: [orderItemSchema], required: true },
  status:    { type: String, enum: ['PENDING', 'DONE'], default: 'PENDING' },
  notes:     { type: String, default: '' }
}, { timestamps: true });

export default mongoose.model('Order', orderSchema);