
require('dotenv').config();
const mongoose = require('mongoose');
const Producto = require('../src/models/producto.model');

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: process.env.MONGODB_DB || 'pos_cafeteria'
    });
    console.log('✅ Conectado para seed');

    const base = [
      { nombre: 'Capuchino', precio: 45, categoria: 'Café',   codigo: 'CAF001', stock: 25, activo: true },
      { nombre: 'Latte',     precio: 50, categoria: 'Café',   codigo: 'CAF002', stock: 20, activo: true },
      { nombre: 'Americano', precio: 35, categoria: 'Café',   codigo: 'CAF003', stock: 30, activo: true },
      { nombre: 'Té Chai',   precio: 42, categoria: 'Té',     codigo: 'TEA001', stock: 12, activo: true },
      { nombre: 'Frappe Oreo', precio: 55, categoria: 'Frappé', codigo: 'FRA001', stock: 10, activo: true },
      { nombre: 'Brownie',   precio: 30, categoria: 'Postre', codigo: 'POS001', stock: 15, activo: true },
      { nombre: 'Cheesecake', precio: 48, categoria: 'Postre', codigo: 'POS002', stock: 8,  activo: true }
    ];

    // Evitar duplicados por codigo
    for (const p of base) {
      await Producto.updateOne({ codigo: p.codigo }, { $setOnInsert: p }, { upsert: true });
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
