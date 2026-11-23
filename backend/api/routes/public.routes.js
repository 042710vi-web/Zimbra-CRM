import { Router } from 'express';
import { createPublicLead } from '../../apicontroller/clientes.controller.js';
import { activity, catalog } from '../../apicontroller/public.controller.js';
import { limitPublicActivity } from '../middleware/publicActivityLimit.middleware.js';

const router = Router();

// HU-04: registro público del visitante, sin una sesión del CRM.
router.post('/leads', createPublicLead);
// Catálogo público de productos, campañas activas y acciones para el recorrido del sitio.
router.get('/catalog', catalog);
// HU-15: demo de actividad anónima limitada por dirección IP; la integración del sitio productivo conserva /api/tracking/eventos con clave.
router.post('/activities', limitPublicActivity, activity);

export default router;
