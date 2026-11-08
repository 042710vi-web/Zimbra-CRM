import { Router } from 'express';
import { create } from '../../apicontroller/asignaciones.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { allowRoles } from '../middleware/role.middleware.js';
const router = Router();
// HU-23: asignar clientes a vendedores responsables.
// Endpoint: POST /api/assignments.
router.post('/', authenticate, allowRoles('Administrador'), create);
export default router;
