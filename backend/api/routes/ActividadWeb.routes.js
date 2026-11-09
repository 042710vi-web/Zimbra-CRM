/**
 * Define las direcciones para consultar y gestionar actividad web.
 */
import { Router } from 'express';
import { create, createBatch } from '../../apicontroller/ActividadWeb.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();
router.use(authenticate);
// HU-20: Registra una actividad web individual.
router.post('/', create);
// HU-20: Registra varias actividades e informa cuáles fueron rechazadas.
router.post('/bulk', createBatch);
/** Pone las direcciones de esta área a disposición de la aplicación. */
export default router;