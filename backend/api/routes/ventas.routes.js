/**
 * Define las direcciones para consultar y gestionar ventas.
 */
import { Router } from 'express';
import { changeStatus, create, detail, list, update } from '../../apicontroller/ventas.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { allowRoles } from '../middleware/role.middleware.js';
const router = Router();
router.use(authenticate);
// HU-27: GET /api/sales consulta ventas y detalle.
router.get('/', list);
router.get('/detalle', detail);
// HU-26: POST /api/sales registra venta y detalle de productos.
router.post('/', create);
// HU-27: POST /api/sales/actualizar actualiza una venta pendiente.
router.post('/actualizar', update);
// HU-28: POST /api/sales/cambiar-estado completa o cancela venta (solo administrador).
router.post('/cambiar-estado', allowRoles('Administrador'), changeStatus);
/** Pone las direcciones de esta área a disposición de la aplicación. */
export default router;
