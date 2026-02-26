import mongoose from 'mongoose';

const KitchenOrderItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  name:      { type: String, required: true },
  quantity:  { type: Number, required: true, min: 1 },
  note:      { type: String, default: '' }
}, { _id: false });

const KitchenOrderSchema = new mongoose.Schema({
  sessionId:  { type: mongoose.Schema.Types.ObjectId, ref: 'CashSession', required: true },
  userId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // quien generó la comanda
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },

  items:      { type: [KitchenOrderItemSchema], required: true },

  // Estados típicos de cocina
  status:     { type: String, enum: ['NEW','IN_PROGRESS','READY','DELIVERED','CANCELLED'], default: 'NEW', index: true },

  // Opcional: consecutivo simple por día o global
  ticket:     { type: String },

  notes:      { type: String, default: '' },

  createdAt:  { type: Date, default: Date.now },
  updatedAt:  { type: Date, default: Date.now }
}, { timestamps: true });

export default mongoose.model('KitchenOrder', KitchenOrderSchema);