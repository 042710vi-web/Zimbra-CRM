import { Router } from 'express';
import { create } from '../../apicontroller/clientes.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
const router = Router();
// HU-05: registrar nuevos clientes.
// Endpoint: POST /api/clients.
router.post('/', authenticate, create);
export default router;
