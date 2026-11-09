/**
 * Define las direcciones para consultar y gestionar usuarios.
 */
import { Router } from 'express';
import { changeStatus, create, list } from '../../apicontroller/Usuarios.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { allowRoles } from '../middleware/role.middleware.js';
const router = Router();
// HU-03 / HU-04: solo el Administrador gestiona usuarios.
router.use(authenticate, allowRoles('Administrador'));
// Endpoint: GET /api/users.
router.get('/', list);
// Endpoint: POST /api/users.
router.post('/', create);
// Endpoint: POST /api/users/cambiar-estado.
router.post('/cambiar-estado', changeStatus);
/** Pone las direcciones de esta área a disposición de la aplicación. */
export default router;