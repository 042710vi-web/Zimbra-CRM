/** HU-14 - Acciones de marketing.
 * Direcciones disponibles y permisos de acceso.
 */
import { Router } from 'express';
import { changeStatus, create, list, update } from '../../apicontroller/AccionesMarketing.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { allowRoles } from '../middleware/role.middleware.js';

const router = Router();
router.use(authenticate);
// HU-14: Consulta el catálogo de acciones.
router.get('/', allowRoles('Administrador'), list);
// HU-14: Solo el administrador gestiona acciones y puntajes.
router.post('/', allowRoles('Administrador'), create);
router.post('/actualizar', allowRoles('Administrador'), update);
router.post('/cambiar-estado', allowRoles('Administrador'), changeStatus);
/** Permite que la aplicación use las rutas de este módulo. */
export default router;
