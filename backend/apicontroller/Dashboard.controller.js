/** HU-31 - Panel comercial.
 * Recibe las solicitudes y devuelve las respuestas.
 */
import { getDashboard as readDashboard } from '../service/Dashboard.service.js';

// HU-31: Presenta prospectos, alertas de prueba, ventas y asignaciones.
export async function getDashboard(req, res, next) {
  try { res.json(await readDashboard(req.query, req.user)); } catch (error) { next(error); }
}
