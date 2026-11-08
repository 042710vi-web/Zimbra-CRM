import { Router } from 'express';
import { getHealth } from '../../apicontroller/health.controller.js';

const router = Router();

// Endpoint técnico común, sin HU de negocio asignada en el documento.
// Endpoint: GET /api/health
router.get('/health', getHealth);

export default router;
