/**
 * Define las direcciones para consultar y gestionar vendedores.
 */
import { Router } from 'express';
import { changeState, create, list, update } from '../../apicontroller/vendedores.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { allowRoles } from '../middleware/role.middleware.js';

const router = Router();
router.use(authenticate);
// GET /api/vendors (catálogo para administración y asignaciones).
router.get('/', allowRoles('Administrador'), list);
// POST /api/vendors (crear vendedor; historia específica aún no incluida en la matriz HU).
router.post('/', allowRoles('Administrador'), create);
router.post('/actualizar', allowRoles('Administrador'), update);
router.post('/cambiar-estado', allowRoles('Administrador'), changeState);
/** Pone las direcciones de esta área a disposición de la aplicación. */
export default router;
