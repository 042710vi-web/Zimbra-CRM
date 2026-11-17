/** HU-17 - Alertas.
 * Direcciones disponibles y permisos de acceso.
 */
import { Router } from 'express';
import { list, attend } from '../../apicontroller/Alertas.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { allowRoles } from '../middleware/role.middleware.js';
const router = Router();
router.use(authenticate, allowRoles('Administrador', 'Vendedor'));
router.get('/', list);
router.post('/atender', attend);
export default router;
