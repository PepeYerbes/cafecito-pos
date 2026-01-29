
const express = require('express');
const Product = require('../models/Product');

const router = express.Router();

/**
 * GET /api/products
 * Devuelve lista de productos activos.
 */
router.get('/', async (_req, res) => {
  try {
    const products = await Product.find({ isActive: true }).sort({ name: 1 });
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener productos', detail: err.message });
  }
});

module.exports = router;
