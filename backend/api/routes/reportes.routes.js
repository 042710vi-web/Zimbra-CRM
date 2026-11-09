/**
 * Define las direcciones para consultar y gestionar reportes.
 */
import { Router } from 'express';
import { campaigns, clients, interactions, sales } from '../../apicontroller/Reportes.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { allowRoles } from '../middleware/role.middleware.js';

const router = Router();
router.use(authenticate, allowRoles('Administrador'));
// HU-32: genera reporte de ventas por periodo.
// Endpoint: GET /api/reports/sales.
router.get('/sales', sales);
// HU-32: agrupa clientes por estado.
// Endpoint: GET /api/reports/clients.
router.get('/clients', clients);
// HU-32: resume actividad, prospectos calificados y costo por campaña.
// Endpoint: GET /api/reports/campaigns.
router.get('/campaigns', campaigns);
// HU-33: resume interacciones, seguimientos y asignaciones.
// Endpoint: GET /api/reports/interactions.
router.get('/interactions', interactions);

/** Pone las direcciones de esta área a disposición de la aplicación. */
export default router;