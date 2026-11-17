/**
 * Define las direcciones para consultar y gestionar health.
 */
import { Router } from 'express';
import { getHealth } from '../../apicontroller/Health.controller.js';

const router = Router();

// Endpoint técnico común, sin HU de negocio asignada en el documento.
// Endpoint: GET /api/health
router.get('/health', getHealth);

/** Pone las direcciones de esta área a disposición de la aplicación. */
export default router;