import { Router } from 'express';
import {
  retrySync,
  syncClient,
  syncHistory,
} from '../../apicontroller/salesforce.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { allowRoles } from '../middleware/role.middleware.js';

const router = Router();

router.use(authenticate);
router.post('/sincronizar', allowRoles('Administrador', 'Marketing'), syncClient);
router.get('/sincronizaciones', allowRoles('Administrador', 'Marketing'), syncHistory);
router.post('/reintentar', allowRoles('Administrador', 'Marketing'), retrySync);

export default router;