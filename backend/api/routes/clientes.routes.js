import { Router } from 'express';
import { create, list, update, changeStatus } from '../../apicontroller/clientes.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
const router = Router();
// HU-06: listar y buscar clientes. Endpoint: GET /api/clients.
router.get('/', authenticate, list);
// HU-05: registrar nuevos clientes. Endpoint: POST /api/clients.
router.post('/', authenticate, create);
// HU-07: actualizar un cliente (ID en el body). Endpoint: POST /api/clients/actualizar.
router.post('/actualizar', authenticate, update);
// HU-08: cambiar el estado de un cliente. Endpoint: POST /api/clients/cambiar-estado.
router.post('/cambiar-estado', authenticate, changeStatus);
export default router;
