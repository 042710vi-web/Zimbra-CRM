/**
 * Define las direcciones para consultar y gestionar campanas marketing.
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
// HU-16/HU-17: Consulta las campañas y sus resultados.
router.get('/', listarCampanasMarketing);
// HU-16: Únicamente el administrador crea campañas.
router.post('/', allowRoles('Administrador'), crearCampanaMarketing);
// HU-17: Únicamente el administrador modifica campañas.
router.post('/actualizar', allowRoles('Administrador'), actualizarCampanaMarketing);
// HU-18: Únicamente el administrador cambia el estado.
router.post('/cambiar-estado', allowRoles('Administrador'), cambiarEstadoCampanaMarketing);
/** Pone las direcciones de esta área a disposición de la aplicación. */
export default router;