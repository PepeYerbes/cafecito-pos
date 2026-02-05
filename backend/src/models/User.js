import mongoose from 'mongoose';
const UserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, index: true, unique: true, sparse: true },
  passwordHash: String,
  role: { type: String, enum: ['ADMIN','CASHIER'], default: 'CASHIER' }
}, { timestamps: true });

export default mongoose.model('User', UserSchema);