
const router = require('express').Router();
const { body, param, query } = require('express-validator');
const ctrl = require('../controllers/productos.controller');

// Middlewares simples para capturar errores de validación
const handleValidation = (req, res, next) => {
  const { validationErrors } = req;
  next();
};
const { validationResult } = require('express-validator');
const validate = (validators) => [
  ...validators,
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });
    next();
  }
];

// Listado con filtros y paginación
router.get(
  '/',
  validate([
    query('page').optional().isInt({ min: 1 }).withMessage('page debe ser entero >=1'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit 1-100'),
    query('minPrecio').optional().isFloat({ min: 0 }),
    query('maxPrecio').optional().isFloat({ min: 0 }),
    query('activo').optional().isBoolean().withMessage('activo debe ser booleano')
  ]),
  ctrl.listar
);

// Obtener por ID
router.get(
  '/:id',
  validate([param('id').isMongoId().withMessage('ID inválido')]),
  ctrl.obtenerPorId
);

// Crear
router.post(
  '/',
  validate([
    body('nombre').isString().isLength({ min: 2 }),
    body('precio').isFloat({ min: 0 }),
    body('categoria').isString().isIn(['Café', 'Té', 'Frappé', 'Postre', 'Snack', 'Otro']),
    body('codigo').isString().isLength({ min: 2 }),
    body('stock').optional().isInt({ min: 0 }),
    body('activo').optional().isBoolean()
  ]),
  ctrl.crear
);

// Actualizar
router.put(
  '/:id',
  validate([
    param('id').isMongoId(),
    body('nombre').optional().isString().isLength({ min: 2 }),
    body('precio').optional().isFloat({ min: 0 }),
    body('categoria').optional().isString().isIn(['Café', 'Té', 'Frappé', 'Postre', 'Snack', 'Otro']),
    body('codigo').optional().isString().isLength({ min: 2 }),
    body('stock').optional().isInt({ min: 0 }),
    body('activo').optional().isBoolean()
  ]),
  ctrl.actualizar
);

// Eliminar
router.delete(
  '/:id',
  validate([param('id').isMongoId()]),
  ctrl.eliminar
);

module.exports = router;
