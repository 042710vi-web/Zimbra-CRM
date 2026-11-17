/** HU-09 a HU-11 - Descargas de prueba.
 * Direcciones disponibles y permisos de acceso.
 */
import { Router } from 'express';
import { create, list, updateExpirations } from '../../apicontroller/DescargasPrueba.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { allowRoles } from '../middleware/role.middleware.js';

/** HU-09 a HU-11: operaciones internas del CRM bajo /api/trials.
 * Administradores y vendedores necesitan una sesión Bearer para registrar
 * y consultar pruebas. La actualización manual de vencimientos requiere
 * además el rol Administrador.
 */
const router = Router();
router.use(authenticate);
// HU-10: Consulta pruebas con filtros por estado, cliente, producto y vencimiento.
router.get('/', list);
// HU-09: Registra una descarga de prueba de 60 días.
router.post('/', create);
// HU-11: Permite al administrador ejecutar la actualización de vencimientos.
router.post('/actualizar-vencimientos', allowRoles('Administrador'), updateExpirations);

/** HU-09: entrada del formulario web bajo POST /api/public/descargas.
 * No exige sesión del CRM. Recibe un cliente ya identificado y un producto;
 * utiliza el mismo controlador, servicio y procedimiento que el registro
 * interno, con las mismas validaciones de cliente, producto y duplicados.
 * El formulario puede enviar la solicitud sin iniciar sesión en el CRM.
 */
export const publicDownloadsRoutes = Router();
publicDownloadsRoutes.post('/descargas', create);
/** Permite que la aplicación use las rutas de este módulo. */
export default router;
