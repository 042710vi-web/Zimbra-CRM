/** HU-16 - Calificación de prospectos.
 * Revisa los datos y coordina las operaciones del módulo.
 */
import { recalculateLeadScores as recalculate } from '../repository/Calificacion.repository.js';

/** Indica quién solicita recalcular los puntos de los clientes. */
export async function recalculateLeadScores(user = {}) {
  return recalculate(user.email);
}
