import { Router } from 'express';
import {
  create,
  detail,
  list,
  update,
} from '../../apicontroller/empresas.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/detalle', authenticate, detail);
router.get('/', authenticate, list);
router.post('/', authenticate, create);
router.post('/actualizar', authenticate, update);

export default router;