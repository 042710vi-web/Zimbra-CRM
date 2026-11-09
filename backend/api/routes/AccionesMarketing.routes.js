/**
 * Define las direcciones para consultar y gestionar acciones marketing.
 */
import { Router } from 'express';
import { changeStatus, create, list, recalculate, update } from '../../apicontroller/AccionesMarketing.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { allowRoles } from '../middleware/role.middleware.js';

const router = Router();
router.use(authenticate);
// HU-19: Consulta el catálogo de acciones.
router.get('/actions', allowRoles('Administrador'), list);
// HU-19: Solo el adminsitrador gestiona acciones y puntajes.
router.post('/actions', allowRoles('Administrador'), create);
router.post('/actions/actualizar', allowRoles('Administrador'), update);
router.post('/actions/cambiar-estado', allowRoles('Administrador'), changeStatus);
// HU-21: El administrador puede solicitar una recalificación general.
router.post('/scoring/recalculate', allowRoles('Administrador'), recalculate);
/** Pone las direcciones de esta área a disposición de la aplicación. */
export default router;