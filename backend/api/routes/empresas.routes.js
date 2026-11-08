import { Router } from 'express';
import { create, list } from '../../apicontroller/empresas.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
const router = Router();
// HU-09: listar empresas. Endpoint: GET /api/empresas.
router.get('/', authenticate, list);
// HU-09: registrar una empresa. Endpoint: POST /api/empresas.
router.post('/', authenticate, create);
export default router;
