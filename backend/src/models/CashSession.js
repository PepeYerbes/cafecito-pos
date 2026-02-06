import mongoose from 'mongoose';

const MovementSchema = new mongoose.Schema({
  type: { type: String, enum: ['INGRESO', 'EGRESO', 'IN', 'OUT'], required: true },
  reason: { type: String, default: '' },
  amount: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now }
}, { _id: false });

const PaymentSummarySchema = new mongoose.Schema({
  method: { type: String, enum: ['CASH', 'CARD', 'MIXED'], required: true },
  total: { type: Number, required: true },
  count: { type: Number, required: true }
}, { _id: false });

const TotalsSchema = new mongoose.Schema({
  gross: { type: Number, default: 0 },
  taxes: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  total: { type: Number, default: 0 }
}, { _id: false });

const CashSessionSchema = new mongoose.Schema({
  userId: { type: String, index: true, required: true },

  openedAt: { type: Date, required: true },
  closedAt: { type: Date },

  // Campos canónicos + alias de compatibilidad
  initialCash: { type: Number, required: true, alias: 'openingAmount' },
  countedCash: { type: Number, alias: 'closingAmount' },
  expectedCash: { type: Number, alias: 'expectedAmount' },
  difference: { type: Number, default: 0 },

  status: { type: String, enum: ['OPEN', 'CLOSED'], default: 'OPEN', index: true },

  // Agregados para el PDF
  totals: { type: TotalsSchema, default: undefined },
  payments: { type: [PaymentSummarySchema], default: undefined },
  movements: { type: [MovementSchema], default: undefined },
  notes: { type: String, default: '' },

  // Opcionales para imprimir en PDF
  branchName: { type: String },
  shiftName: { type: String },

  // Quién abrió/cerró (opcional)
  openedBy: { type: mongoose.Schema.Types.ObjectId },
  closedBy: { type: mongoose.Schema.Types.ObjectId }
}, { timestamps: true, strict: true });

export default mongoose.model('CashSession', CashSessionSchema);