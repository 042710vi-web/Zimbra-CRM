import { Router } from 'express';
import { login } from '../../apicontroller/auth.controller.js';
const router = Router();
router.post('/login', login);
export default router;
