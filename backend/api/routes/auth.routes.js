/**
 * Define las direcciones para consultar y gestionar auth.
 */
import { Router } from 'express';
import { login, logout, requestReset, resetPassword } from '../../apicontroller/Auth.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
const router = Router();
// HU-01: iniciar sesión.
// Endpoint: POST /api/auth/login.
router.post('/login', login);
// HU-01: cerrar sesión (el token se descarta en el frontend).
// Endpoint: POST /api/auth/logout.
router.post('/logout', authenticate, logout);
// Recuperación de contraseña: flujo existente fuera de las 33 historias actualizadas.
// Endpoint: POST /api/auth/recuperar.
router.post('/recuperar', requestReset);
// Recuperación de contraseña: flujo existente fuera de las 33 historias actualizadas.
// Endpoint: POST /api/auth/restablecer.
router.post('/restablecer', resetPassword);
/** Pone las direcciones de esta área a disposición de la aplicación. */
export default router;
