
const mongoose = require('mongoose');

const saleItemSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    lineSubtotal: { type: Number, required: true, min: 0 },
  },
  { _id: true }
);

const saleSchema = new mongoose.Schema(
  {
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // lo usaremos en Día 6
    status: { type: String, enum: ['OPEN', 'PAID', 'VOIDED', 'REFUNDED'], default: 'OPEN' },
    items: { type: [saleItemSchema], default: [] },
    subtotal: { type: Number, default: 0 },
    discountPercent: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Sale', saleSchema);
