import mongoose from 'mongoose';

const CashSessionSchema = new mongoose.Schema({
  userId: { type: String, index: true, required: true },
  openedAt: { type: Date, required: true },
  closedAt: { type: Date },
  openingAmount: { type: Number, required: true },
  closingAmount: { type: Number },
  expectedAmount: { type: Number },
  status: { type: String, enum: ['OPEN','CLOSED'], default: 'OPEN' }
}, { timestamps: true });

export default mongoose.model('CashSession', CashSessionSchema);