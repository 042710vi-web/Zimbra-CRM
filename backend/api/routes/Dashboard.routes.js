/** HU-31 - Panel comercial.
 * Direcciones disponibles y permisos de acceso.
 */
import { Router } from 'express';
import { getDashboard } from '../../apicontroller/Dashboard.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { allowRoles } from '../middleware/role.middleware.js';

const router = Router();
router.get('/', authenticate, allowRoles('Administrador', 'Vendedor'), getDashboard);
/** Permite que la aplicación use las rutas de este módulo. */
export default router;