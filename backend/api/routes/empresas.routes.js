/**
 * Define las direcciones para consultar y gestionar empresas.
 */
import { Router } from 'express';
import { create, list } from '../../apicontroller/Empresas.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
const router = Router();
// HU-09: listar empresas. Endpoint: GET /api/empresas.
router.get('/', authenticate, list);
// HU-09: registrar una empresa. Endpoint: POST /api/empresas.
router.post('/', authenticate, create);
/** Pone las direcciones de esta área a disposición de la aplicación. */
export default router;