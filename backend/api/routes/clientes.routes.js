/**
 * Define las direcciones para consultar y gestionar clientes.
 */
import { Router } from 'express';
import { create, list, update, changeStatus } from '../../apicontroller/Clientes.controller.js';
import { listForClient } from '../../apicontroller/ActividadWeb.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
const router = Router();
// HU-05: Listar y buscar clientes. Endpoint: GET /api/clients.
router.get('/', authenticate, list);
// HU-04: Registrar nuevos clientes. Endpoint: POST /api/clients.
router.post('/', authenticate, create);
// HU-05: Actualizar un cliente (ID en el body). Endpoint: POST /api/clients/actualizar.
router.post('/actualizar', authenticate, update);
// HU-05: Cambiar el estado de un cliente. Endpoint: POST /api/clients/cambiar-estado.
router.post('/cambiar-estado', authenticate, changeStatus);
// HU-15: Consulta la actividad web vinculada al historial del cliente.
router.get('/:id/activities', authenticate, listForClient);
/** Pone las direcciones de esta área a disposición de la aplicación. */
export default router;
