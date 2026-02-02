
const { Schema, model } = require('mongoose');

const ProductoSchema = new Schema(
  {
    nombre: {
      type: String,
      required: [true, 'El nombre es obligatorio'],
      trim: true,
      minlength: [2, 'El nombre debe tener al menos 2 caracteres'],
      maxlength: [120, 'El nombre no debe exceder 120 caracteres']
    },
    precio: {
      type: Number,
      required: [true, 'El precio es obligatorio'],
      min: [0, 'El precio no puede ser negativo']
    },
    categoria: {
      type: String,
      required: [true, 'La categoría es obligatoria'],
      enum: {
        values: ['Café', 'Té', 'Frappé', 'Postre', 'Snack', 'Otro'],
        message: 'Categoría no válida'
      }
    },
    codigo: {
      type: String,
      required: [true, 'El código es obligatorio'],
      unique: true,
      uppercase: true,
      trim: true
    },
    stock: {
      type: Number,
      default: 0,
      min: [0, 'El stock no puede ser negativo']
    },
    activo: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true // createdAt, updatedAt
  }
);

// Índices recomendados
ProductoSchema.index({ codigo: 1 }, { unique: true });
ProductoSchema.index({ nombre: 'text', categoria: 1 });

module.exports = model('Producto', ProductoSchema);
