/** HU-12 y HU-13 - Campañas.
 * Direcciones disponibles y permisos de acceso.
 */
import { Router } from 'express';
import {
  actualizarCampanaMarketing,
  cambiarEstadoCampanaMarketing,
  crearCampanaMarketing,
  listarCampanasMarketing,
} from '../../apicontroller/CampanasMarketing.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { allowRoles } from '../middleware/role.middleware.js';

const router = Router();
router.use(authenticate);
// HU-13: Consulta las campañas y sus resultados.
router.get('/', allowRoles('Administrador'), listarCampanasMarketing);
// HU-12: Únicamente el administrador crea campañas.
router.post('/', allowRoles('Administrador'), crearCampanaMarketing);
// HU-13: Únicamente el administrador modifica campañas.
router.post('/actualizar', allowRoles('Administrador'), actualizarCampanaMarketing);
// HU-13: Únicamente el administrador cambia el estado.
router.post('/cambiar-estado', allowRoles('Administrador'), cambiarEstadoCampanaMarketing);
/** Permite que la aplicación use las rutas de este módulo. */
export default router;
