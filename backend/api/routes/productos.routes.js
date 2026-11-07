import { Router } from 'express';
import { list } from '../../apicontroller/productos.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
const router = Router();
router.get('/', authenticate, list);
export default router;
