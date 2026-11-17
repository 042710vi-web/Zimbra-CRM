/** HU-15 y HU-16 - Actividad web.
 * Direcciones disponibles y permisos de acceso.
 */
import { Router } from 'express';
import { create, createBatch, listForClient } from '../../apicontroller/ActividadWeb.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authenticateTracking } from '../middleware/tracking.middleware.js';

/** HU-15: registro interno bajo /api/activities y /api/activities/bulk.
 * Requiere una sesión con token del CRM para registrar eventos individuales
 * o lotes. Usa el mismo registro de actividad que los eventos enviados por el sitio web.
 */
const router = Router();
router.use(authenticate);
// HU-15: Registra una actividad web individual.
router.post('/', create);
// HU-15: Registra varias actividades e informa cuáles fueron rechazadas.
router.post('/bulk', createBatch);

/** HU-15: consulta del historial bajo GET /api/web-activity.
 * Requiere sesión con token; el servicio limita al vendedor a sus clientes.
 */
export const historyRoutes = Router();
historyRoutes.get('/', authenticate, listForClient);

/** HU-15: recepción automática bajo POST /api/tracking/eventos.
 * El sitio web debe enviar los eventos: esta ruta no observa visitas por sí
 * sola. Valida x-tracking-key contra ZIMBRA_TRACKING_KEY en lugar de exigir
 * una sesión del CRM. Usa el mismo controlador y procedimiento de actividad
 * para registrar el evento, sumar puntaje y generar las alertas aplicables.
 */
export const trackingRoutes = Router();
trackingRoutes.post('/eventos', authenticateTracking, create);
/** Permite que la aplicación use las rutas de este módulo. */
export default router;
