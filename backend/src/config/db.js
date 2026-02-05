import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/pos';
mongoose.connect(uri, { autoIndex: true });

mongoose.connection.on('connected', () => console.log('MongoDB conectado'));
mongoose.connection.on('error', (err) => console.error('MongoDB error', err));