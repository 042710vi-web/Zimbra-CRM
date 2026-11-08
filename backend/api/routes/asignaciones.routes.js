import { Router } from 'express';
import { changeAssignee, close, create, list } from '../../apicontroller/asignaciones.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { allowRoles } from '../middleware/role.middleware.js';
const router = Router();
router.use(authenticate);
// HU-24: GET /api/assignments lista asignaciones del vendedor o todas para administrador.
router.get('/', list);
// HU-23: POST /api/assignments asigna un prospecto (solo administrador).
router.post('/', allowRoles('Administrador'), create);
// HU-25: POST /api/assignments/reasignar conserva y finaliza la asignación anterior.
router.post('/reasignar', allowRoles('Administrador'), changeAssignee);
// HU-25: POST /api/assignments/finalizar finaliza la asignación activa.
router.post('/finalizar', allowRoles('Administrador'), close);
export default router;
