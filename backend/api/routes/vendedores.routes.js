import { Router } from 'express';
import { create, list } from '../../apicontroller/vendedores.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { allowRoles } from '../middleware/role.middleware.js';

const router = Router();
router.use(authenticate);
// GET /api/vendors (catálogo para administración y asignaciones).
router.get('/', allowRoles('Administrador'), list);
// POST /api/vendors (crear vendedor; historia específica aún no incluida en la matriz HU).
router.post('/', allowRoles('Administrador'), create);
export default router;
