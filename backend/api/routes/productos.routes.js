/**
 * Define las direcciones para consultar y gestionar productos.
 */
import { Router } from 'express';
import { changeStatus, create, list, update } from '../../apicontroller/Productos.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { allowRoles } from '../middleware/role.middleware.js';
const router = Router();
router.use(authenticate);
// HU-11: Consulta el catálogo. El vendedor solo puede ver productos activos.
router.get('/', list);
// HU-10: Solo  el administrador registra nuevas licencias.
router.post('/', allowRoles('Administrador'), create);
// HU-11: Solo el administrador modifica el catálogo.
router.post('/actualizar', allowRoles('Administrador'), update);
// HU-12: El producto se desactiva sin eliminar su historial.
router.post('/cambiar-estado', allowRoles('Administrador'), changeStatus);
/** Pone las direcciones de esta área a disposición de la aplicación. */
export default router;