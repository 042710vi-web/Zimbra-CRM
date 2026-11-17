import { Router } from 'express';
import { auditHistory } from '../../apicontroller/auditoria.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { allowRoles } from '../middleware/role.middleware.js';

const router = Router();

router.get('/', authenticate, allowRoles('Administrador'), auditHistory);

export default router;