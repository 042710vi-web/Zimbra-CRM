/**
 * Recibe las solicitudes de descargas prueba, las entrega al servicio correspondiente y comunica el resultado.
 */
import { expireTrialDates, listTrials, registerTrial } from '../service/DescargasPrueba.service.js';

// HU-14: Consulta las pruebas y su tiempo restante.
export async function list(req, res, next) {
  try { res.json(await listTrials(req.query, req.user)); } catch (error) { next(error); }
}

// HU-13: Registra una prueba y su actividad de puntaje.
export async function create(req, res, next) {
  try { res.status(201).json(await registerTrial(req.body, req.user)); } catch (error) { next(error); }
}

// HU-15: Actualiza las pruebas vencidas al solicitar la operación.
export async function updateExpirations(req, res, next) {
  try { res.json(await expireTrialDates(req.user)); } catch (error) { next(error); }
}