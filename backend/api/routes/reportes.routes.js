/**
 * Define las direcciones para consultar y gestionar reportes.
 */
import { Router } from 'express';
import { indicators, assignments, automation, campaigns, clients, exportCsv, interactions, sales } from '../../apicontroller/reportes.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { allowRoles } from '../middleware/role.middleware.js';

const router = Router();
router.use(authenticate, allowRoles('Administrador'));
// HU-29: genera reporte de ventas por periodo.
// Endpoint: GET /api/reports/sales.
router.get('/sales', sales);
router.get('/indicators', indicators);
// HU-29: agrupa clientes por estado.
// Endpoint: GET /api/reports/clients.
router.get('/clients', clients);
// HU-29: resume actividad, prospectos calificados y costo por campaña.
// Endpoint: GET /api/reports/campaigns.
router.get('/campaigns', campaigns);
// HU-30: resume interacciones, seguimientos y asignaciones.
// Endpoint: GET /api/reports/interactions.
router.get('/interactions', interactions);
router.get('/assignments', assignments);
router.get('/automation', automation);
router.get('/exportar', exportCsv);

/** Pone las direcciones de esta área a disposición de la aplicación. */
export default router;
