/**
 * Define las direcciones para consultar y gestionar ventas.
 */
import { Router } from 'express';
import { changeStatus, create, list, update } from '../../apicontroller/Ventas.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { allowRoles } from '../middleware/role.middleware.js';
const router = Router();
router.use(authenticate);
// HU-29: GET /api/sales consulta ventas y detalle.
router.get('/', list);
// HU-28: POST /api/sales registra venta y detalle de productos.
router.post('/', create);
// HU-30: POST /api/sales/actualizar actualiza una venta pendiente.
router.post('/actualizar', update);
// HU-31: POST /api/sales/cambiar-estado completa o cancela venta (solo administrador).
router.post('/cambiar-estado', allowRoles('Administrador'), changeStatus);
/** Pone las direcciones de esta área a disposición de la aplicación. */
export default router;