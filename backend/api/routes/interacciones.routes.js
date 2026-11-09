/**
 * Define las direcciones para consultar y gestionar interacciones.
 */
import { Router } from 'express';
import { create, list } from '../../apicontroller/Interacciones.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
const router = Router();
router.use(authenticate);
// HU-27: GET /api/interactions lista interacciones filtradas.
router.get('/', list);
// HU-26: POST /api/interactions registra una interacción comercial.
router.post('/', create);
/** Pone las direcciones de esta área a disposición de la aplicación. */
export default router;