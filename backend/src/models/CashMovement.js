import mongoose from 'mongoose';

const CashMovementSchema = new mongoose.Schema({
  sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'CashSession', required: true, index: true },
  type: { type: String, enum: ['IN','OUT'], required: true },
  reason: { type: String, enum: ['PROVEDOR','GASTO','AJUSTE','DEPOSITO','OTRO','REFUND'], default: 'OTRO' },
  amount: { type: Number, required: true },
  note: { type: String },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

export default mongoose.model('CashMovement', CashMovementSchema);