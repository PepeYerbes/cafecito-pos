
require('dotenv').config();
const mongoose = require('mongoose');
const app = require('./app');

const PORT = process.env.PORT || 3001;
const DB_CONNECTION_STRING = process.env.DB_CONNECTION_STRING;

if (!DB_CONNECTION_STRING) {
  console.error('❌ Falta DB_CONNECTION_STRING en el archivo .env');
  process.exit(1);
}

async function start() {
  try {
    await mongoose.connect(DB_CONNECTION_STRING);
    console.log(`✅ Connected to MongoDB: ${DB_CONNECTION_STRING}`);

    app.listen(PORT, () => {
      console.log(`🚀 Server is running on http://localhost:${PORT}`);
      console.log(`✅ Health check: http://localhost:${PORT}/api/health`);
    });
  } catch (err) {
    console.error('❌ Error connecting to MongoDB:', err.message);
    process.exit(1);
  }
}

start();
