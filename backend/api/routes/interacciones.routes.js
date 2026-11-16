/**
 * Define las direcciones para consultar y gestionar interacciones.
 */
import { Router } from 'express';
import { create, history, list, update } from '../../apicontroller/interacciones.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
const router = Router();
router.use(authenticate);
// HU-25: GET /api/interactions lista interacciones filtradas.
router.get('/', list);
router.get('/historial', history);
// HU-25: POST /api/interactions registra una interacción comercial.
router.post('/', create);
router.post('/actualizar', update);
/** Pone las direcciones de esta área a disposición de la aplicación. */
export default router;
