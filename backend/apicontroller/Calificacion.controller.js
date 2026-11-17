/** HU-16 - Calificación de prospectos.
 * Recibe las solicitudes y devuelve las respuestas.
 */
import { recalculateLeadScores } from '../service/Calificacion.service.js';
export async function recalculate(req, res, next) {
  try { res.json(await recalculateLeadScores(req.user)); } catch (error) { next(error); }
}
