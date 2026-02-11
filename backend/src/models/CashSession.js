import mongoose from 'mongoose';

const MovementSchema = new mongoose.Schema({
  type: { type: String, enum: ['INGRESO', 'EGRESO', 'IN', 'OUT'], required: true },
  reason: { type: String, default: '' },
  amount: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now }
}, { _id: false });

const PaymentSummarySchema = new mongoose.Schema({
  method: { type: String, enum: ['CASH', 'CARD', 'MIXED', 'TRANSFER'], required: true },
  total: { type: Number, required: true },
  count: { type: Number, required: true }
}, { _id: false });


const TotalsSchema = new mongoose.Schema({
  gross: { type: Number, default: 0 },
  taxes: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  total: { type: Number, default: 0 }
}, { _id: false });


const SellerProductSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  name: String,
  qty: { type: Number, default: 0 },
  revenue: { type: Number, default: 0 }
}, { _id: false });

const SellerSummarySchema = new mongoose.Schema({
  userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userName: { type: String },
  totalItems: { type: Number, default: 0 },
  products: { type: [SellerProductSchema], default: undefined }
}, { _id: false });


const CashSessionSchema = new mongoose.Schema({
  userId: { type: String, index: true, required: true },
  openedAt: { type: Date, required: true },
  closedAt: { type: Date },

  initialCash: { type: Number, required: true, alias: 'openingAmount' },
  countedCash: { type: Number, alias: 'closingAmount' },
  expectedCash: { type: Number, alias: 'expectedAmount' },
  difference: { type: Number, default: 0 },
  status: { type: String, enum: ['OPEN', 'CLOSED'], default: 'OPEN', index: true },
  totals: { type: TotalsSchema, default: undefined },
  payments: { type: [PaymentSummarySchema], default: undefined },
  movements: { type: [MovementSchema], default: undefined },
  notes: { type: String, default: '' },
  branchName: { type: String },
  shiftName: { type: String },
  openedBy: { type: mongoose.Schema.Types.ObjectId },
  closedBy: { type: mongoose.Schema.Types.ObjectId },
  itemsCount: { type: Number, default: 0 },
  sellerSummaries: { type: [SellerSummarySchema], default: undefined }

}, { timestamps: true, strict: true });

export default mongoose.model('CashSession', CashSessionSchema);