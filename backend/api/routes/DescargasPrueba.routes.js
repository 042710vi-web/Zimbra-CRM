/**
 * Define las direcciones para consultar y gestionar descargas prueba.
 */
import { Router } from 'express';
import { create, list, updateExpirations } from '../../apicontroller/DescargasPrueba.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { allowRoles } from '../middleware/role.middleware.js';
const router = Router();
router.use(authenticate);
// HU-14: Consulta pruebas con filtros por estado, cliente, producto y vencimiento.
router.get('/', list);
// HU-13: Registra una descarga de prueba de 60 días.
router.post('/', create);
// HU-15: Permite al administrador ejecutar la actualización de vencimientos.
router.post('/actualizar-vencimientos', allowRoles('Administrador'), updateExpirations);
/** Pone las direcciones de esta área a disposición de la aplicación. */
export default router;