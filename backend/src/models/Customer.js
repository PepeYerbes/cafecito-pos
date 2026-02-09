import mongoose from 'mongoose';

const CustomerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, index: true },
  email: { type: String, index: true },
  birthdate: { type: Date },
  notes: { type: String, default: '' },

  // Lealtad
  points: { type: Number, default: 0 },
  totalSpent: { type: Number, default: 0 },
  visitsCount: { type: Number, default: 0 },
  lastVisit: { type: Date },

  active: { type: Boolean, default: true }
}, { timestamps: true });

export default mongoose.model('Customer', CustomerSchema);