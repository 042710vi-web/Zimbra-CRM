/**
 * Define las direcciones para consultar y gestionar clientes.
 */
import { Router } from 'express';
import {
  changeStatus,
  create,
  detail,
  list,
  update,
} from '../../apicontroller/clientes.controller.js';
import { listForClient } from '../../apicontroller/ActividadWeb.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/detalle', authenticate, detail);
router.get('/', authenticate, list);
router.post('/', authenticate, create);
router.post('/actualizar', authenticate, update);
router.post('/cambiar-estado', authenticate, changeStatus);

// HU-15: Consulta la actividad web vinculada al historial del cliente.
router.get('/:id/activities', authenticate, listForClient);
/** Pone las direcciones de esta área a disposición de la aplicación. */
export default router;