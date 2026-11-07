import { Router } from 'express';
import { login } from '../../apicontroller/auth.controller.js';
const router = Router();
// HU-01: iniciar sesión.
// Endpoint: POST /api/auth/login.
router.post('/login', login);
export default router;
