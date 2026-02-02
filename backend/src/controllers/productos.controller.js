
const Producto = require('../models/producto.model');

// Utilidad para parsear números con defaults
const toInt = (v, d) => (Number.isNaN(parseInt(v, 10)) ? d : parseInt(v, 10));
const toFloat = (v, d) => (Number.isNaN(parseFloat(v)) ? d : parseFloat(v));

exports.listar = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      q,                 // búsqueda por nombre (texto)
      categoria,         // filtro exacto por categoría
      minPrecio,         // filtro por rango de precio
      maxPrecio,
      activo             // true/false
    } = req.query;

    const filtros = {};

    if (q) {
      filtros.$text = { $search: q };
    }
    if (categoria) {
      filtros.categoria = categoria;
    }
    if (activo !== undefined) {
      filtros.activo = activo === 'true';
    }
    if (minPrecio !== undefined || maxPrecio !== undefined) {
      filtros.precio = {};
      if (minPrecio !== undefined) filtros.precio.$gte = toFloat(minPrecio, 0);
      if (maxPrecio !== undefined) filtros.precio.$lte = toFloat(maxPrecio, Number.MAX_SAFE_INTEGER);
    }

    const pageNum = toInt(page, 1);
    const limitNum = Math.min(toInt(limit, 10), 100); // limitar a 100 por seguridad
    const skip = (pageNum - 1) * limitNum;

    const [items, total] = await Promise.all([
      Producto.find(filtros).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
      Producto.countDocuments(filtros)
    ]);

    res.json({
      data: items,
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error listando productos', error: err.message });
  }
};

exports.obtenerPorId = async (req, res) => {
  try {
    const { id } = req.params;
    const prod = await Producto.findById(id).lean();
    if (!prod) return res.status(404).json({ message: 'Producto no encontrado' });
    res.json(prod);
  } catch (err) {
    res.status(400).json({ message: 'ID inválido o error al consultar', error: err.message });
  }
};

exports.crear = async (req, res) => {
  try {
    const { nombre, precio, categoria, codigo, stock, activo } = req.body;
    const creado = await Producto.create({ nombre, precio, categoria, codigo, stock, activo });
    res.status(201).json(creado);
  } catch (err) {
    // Mongoose ValidationError o Duplicate Key
    const status = err.code === 11000 ? 409 : 400;
    res.status(status).json({ message: 'Error al crear producto', error: err.message, details: err?.errors });
  }
};

exports.actualizar = async (req, res) => {
  try {
    const { id } = req.params;
    const actualizado = await Producto.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true
    }).lean();
    if (!actualizado) return res.status(404).json({ message: 'Producto no encontrado' });
    res.json(actualizado);
  } catch (err) {
    const status = err.code === 11000 ? 409 : 400;
    res.status(status).json({ message: 'Error al actualizar producto', error: err.message, details: err?.errors });
  }
};

exports.eliminar = async (req, res) => {
  try {
    const { id } = req.params;
    const eliminado = await Producto.findByIdAndDelete(id).lean();
    if (!eliminado) return res.status(404).json({ message: 'Producto no encontrado' });
    res.json({ message: 'Producto eliminado', id: eliminado._id });
  } catch (err) {
    res.status(400).json({ message: 'Error al eliminar', error: err.message });
  }
};
``
