/** HU-17 - Alertas.
 * Recibe las solicitudes y devuelve las respuestas.
 */
import { getAlerts, markAlertAttended } from '../service/Alertas.service.js';
export async function list(req, res, next) {
  try { res.json(await getAlerts(req.query, req.user)); } catch (error) { next(error); }
}
export async function attend(req, res, next) {
  try { res.json(await markAlertAttended(req.body, req.user)); } catch (error) { next(error); }
}
