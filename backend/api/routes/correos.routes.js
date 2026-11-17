import { Router } from 'express';
import { list, retry } from '../../apicontroller/correos.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { allowRoles } from '../middleware/role.middleware.js';
const router = Router();
router.use(authenticate, allowRoles('Administrador'));
router.get('/', list);
router.post('/reintentar', retry);
export default router;
