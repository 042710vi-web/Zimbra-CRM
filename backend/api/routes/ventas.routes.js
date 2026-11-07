import { Router } from 'express';
import { create } from '../../apicontroller/ventas.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
const router = Router();
// HU-28: registrar una venta con su detalle.
// Endpoint: POST /api/sales.
router.post('/', authenticate, create);
export default router;
