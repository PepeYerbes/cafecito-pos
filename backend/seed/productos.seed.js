// backend/src/seed.js
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Product from './models/Product.js';

dotenv.config();

const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/pos';

async function run() {
  try {
    await mongoose.connect(uri, { autoIndex: true });
    console.log('✅ Conectado a Mongo para seed');

    const base = [
      { nombre: 'Capuchino', precio: 45, categoria: 'Café',   codigo: 'CAF001', stock: 25, activo: true },
      { nombre: 'Latte',     precio: 50, categoria: 'Café',   codigo: 'CAF002', stock: 20, activo: true },
      { nombre: 'Americano', precio: 35, categoria: 'Café',   codigo: 'CAF003', stock: 30, activo: true },
      { nombre: 'Té Chai',   precio: 42, categoria: 'Té',     codigo: 'TEA001', stock: 12, activo: true },
      { nombre: 'Frappe Oreo', precio: 55, categoria: 'Frappé', codigo: 'FRA001', stock: 10, activo: true },
      { nombre: 'Brownie',   precio: 30, categoria: 'Postre', codigo: 'POS001', stock: 15, activo: true },
      { nombre: 'Cheesecake', precio: 48, categoria: 'Postre', codigo: 'POS002', stock: 8,  activo: true }
    ];

    for (const p of base) {
      // Usa alias: Product aceptará nombre/codigo/precio/activo gracias al schema
      await Product.updateOne(
        { sku: p.codigo },
        {
          $setOnInsert: {
            name: p.nombre,
            sku: p.codigo,
            price: p.precio,
            categoria: p.categoria,
            stock: p.stock,
            active: p.activo,
            taxRate: 0.16
          }
        },
        { upsert: true }
      );
    }

    console.log('🌱 Seed de productos listo');
  } catch (e) {
    console.error('❌ Error en seed:', e);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado');
  }
}

run();