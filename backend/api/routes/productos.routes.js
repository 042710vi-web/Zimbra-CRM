import { Router } from 'express';
import { list } from '../../apicontroller/productos.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
const router = Router();
// HU-11: consultar el catálogo de productos.
// Endpoint: GET /api/products.
router.get('/', authenticate, list);
export default router;
