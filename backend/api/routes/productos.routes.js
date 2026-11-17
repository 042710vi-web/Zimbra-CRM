/** HU-07 y HU-08 - Productos y licencias.
 * Direcciones disponibles y permisos de acceso.
 */
import { Router } from 'express';
import { changeStatus, create, list, update } from '../../apicontroller/productos.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { allowRoles } from '../middleware/role.middleware.js';

const router = Router();
router.use(authenticate);
// HU-08: Consulta el catálogo. El vendedor solo puede ver productos activos.
router.get('/', list);
// HU-07: Solo el administrador registra nuevas licencias.
router.post('/', allowRoles('Administrador'), create);
// HU-08: Solo el administrador modifica el catálogo.
router.post('/actualizar', allowRoles('Administrador'), update);
// HU-08: El producto se desactiva sin eliminar su historial.
router.post('/cambiar-estado', allowRoles('Administrador'), changeStatus);
/** Permite que la aplicación use las rutas de este módulo. */
router.put('/:id', allowRoles('Administrador'), update);
router.patch('/:id/estado', allowRoles('Administrador'), changeStatus);
export default router;
