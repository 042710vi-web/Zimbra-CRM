import { Router } from 'express';
import { login, logout } from '../../apicontroller/auth.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
const router = Router();
// HU-01: iniciar sesión.
// Endpoint: POST /api/auth/login.
router.post('/login', login);
// HU-02: cerrar sesión (el token se descarta en el frontend).
// Endpoint: POST /api/auth/logout.
router.post('/logout', authenticate, logout);
export default router;
