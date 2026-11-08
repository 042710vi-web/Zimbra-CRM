import { Router } from 'express';
import { create } from '../../apicontroller/descargas.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
const router = Router();
// HU-13: registrar una descarga de prueba.
// Endpoint: POST /api/trials.
router.post('/', authenticate, create);
export default router;
