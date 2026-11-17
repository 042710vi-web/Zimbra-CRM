/** HU-16 - Calificación de prospectos.
 * Direcciones disponibles y permisos de acceso.
 */
import { Router } from 'express';
import { recalculate } from '../../apicontroller/Calificacion.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { allowRoles } from '../middleware/role.middleware.js';

const router = Router();
router.post('/recalificar', authenticate, allowRoles('Administrador'), recalculate);

/** Dirección alternativa para las solicitudes de calificación usadas por marketing. */
export const legacyScoringRoutes = Router();
legacyScoringRoutes.post('/recalculate', authenticate, allowRoles('Administrador'), recalculate);

export default router;
