/**
 * Define las direcciones para consultar y gestionar dashboard.
 */
import { Router } from 'express';
import { getDashboard } from '../../apicontroller/Dashboard.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { allowRoles } from '../middleware/role.middleware.js';

const router = Router();
router.get('/', authenticate, allowRoles('Administrador', 'Vendedor'), getDashboard);
/** Pone las direcciones de esta área a disposición de la aplicación. */
export default router;