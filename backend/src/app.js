
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const productsRouter = require('./routes/products');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Rutas base
app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'Cafecito Feliz API',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/products', productsRouter);

module.exports = app;
``
