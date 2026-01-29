
require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/Product');

// 👇 Modelos inline para seed (rápido y simple hoy)
// Mañana los hacemos formales en /models si quieres.
const customerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String },
    phone: { type: String },
    purchasesCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const saleSchema = new mongoose.Schema(
  {
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
    status: { type: String, enum: ['OPEN', 'PAID', 'VOIDED', 'REFUNDED'], default: 'PAID' },
    items: [
      {
        productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        name: String,
        quantity: Number,
        unitPrice: Number,
        lineSubtotal: Number,
      },
    ],
    subtotal: Number,
    discountPercent: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    total: Number,
  },
  { timestamps: true }
);

const Customer = mongoose.model('Customer', customerSchema);
const Sale = mongoose.model('Sale', saleSchema);

const DB_CONNECTION_STRING = process.env.DB_CONNECTION_STRING;

async function seed() {
  if (!DB_CONNECTION_STRING) {
    console.error('❌ Falta DB_CONNECTION_STRING en .env');
    process.exit(1);
  }

  await mongoose.connect(DB_CONNECTION_STRING);
  console.log(`✅ Database connected to ${DB_CONNECTION_STRING}`);

  // Limpieza ligera (solo colecciones de este seed)
  await Product.deleteMany({});
  await Customer.deleteMany({});
  await Sale.deleteMany({});

  console.log('🌱 Seeding products...');
  const products = await Product.insertMany([
    { name: 'Espresso', sku: 'ESP-001', price: 50, category: 'Bebidas' },
    { name: 'Capuccino', sku: 'CAP-001', price: 60, category: 'Bebidas' },
    { name: 'Latte', sku: 'LAT-001', price: 65, category: 'Bebidas' },
    { name: 'Americano', sku: 'AME-001', price: 55, category: 'Bebidas' },
    { name: 'Croissant', sku: 'CRO-001', price: 45, category: 'Panadería' },
    { name: 'Brownie', sku: 'BRO-001', price: 40, category: 'Panadería' },
  ]);
  console.log(`✅ Products created: ${products.length}`);

  console.log('🌱 Seeding customers...');
  const customers = await Customer.insertMany([
    { name: 'Juan Pérez', email: 'juan@test.com', purchasesCount: 0 },
    { name: 'Ana López', email: 'ana@test.com', purchasesCount: 3 },
    { name: 'Luis García', email: 'luis@test.com', purchasesCount: 7 },
  ]);
  console.log(`✅ Customers created: ${customers.length}`);

  console.log('🌱 Seeding sales...');
  // Ventas de ejemplo
  const espresso = products.find(p => p.sku === 'ESP-001');
  const capuccino = products.find(p => p.sku === 'CAP-001');
  const croissant = products.find(p => p.sku === 'CRO-001');

  const sale1Items = [
    {
      productId: espresso._id,
      name: espresso.name,
      quantity: 1,
      unitPrice: espresso.price,
      lineSubtotal: 1 * espresso.price,
    },
    {
      productId: croissant._id,
      name: croissant.name,
      quantity: 1,
      unitPrice: croissant.price,
      lineSubtotal: 1 * croissant.price,
    },
  ];
  const sale1Subtotal = sale1Items.reduce((acc, it) => acc + it.lineSubtotal, 0);

  const sale2Items = [
    {
      productId: capuccino._id,
      name: capuccino.name,
      quantity: 2,
      unitPrice: capuccino.price,
      lineSubtotal: 2 * capuccino.price,
    },
  ];
  const sale2Subtotal = sale2Items.reduce((acc, it) => acc + it.lineSubtotal, 0);

  const sales = await Sale.insertMany([
    {
      customerId: customers[1]._id,
      status: 'PAID',
      items: sale1Items,
      subtotal: sale1Subtotal,
      discountPercent: 0,
      discountAmount: 0,
      total: sale1Subtotal,
    },
    {
      customerId: customers[2]._id,
      status: 'PAID',
      items: sale2Items,
      subtotal: sale2Subtotal,
      discountPercent: 0,
      discountAmount: 0,
      total: sale2Subtotal,
    },
  ]);

  console.log(`✅ Sales created: ${sales.length}`);
  console.log('🎉 Done! Database ready for development.');

  await mongoose.disconnect();
}

seed().catch(async (err) => {
  console.error('❌ Seed error:', err);
  try { await mongoose.disconnect(); } catch (_) {}
  process.exit(1);
});
