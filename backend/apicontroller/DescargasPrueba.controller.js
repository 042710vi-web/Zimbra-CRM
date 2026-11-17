/** HU-09 a HU-11 - Descargas de prueba.
 * Recibe las solicitudes y devuelve las respuestas.
 */
import { expireTrialDates, listTrials, registerTrial } from '../service/DescargasPrueba.service.js';

// HU-09: Registra una prueba y su actividad de puntaje.
export async function create(req, res, next) {
  try { res.status(201).json(await registerTrial(req.body, req.user)); } catch (error) { next(error); }
}

// HU-10: Consulta las pruebas y su tiempo restante.
export async function list(req, res, next) {
  try { res.json(await listTrials(req.query, req.user)); } catch (error) { next(error); }
}

// HU-11: Actualiza las pruebas vencidas al solicitar la operación.
export async function updateExpirations(req, res, next) {
  try { res.json(await expireTrialDates(req.user)); } catch (error) { next(error); }
}
