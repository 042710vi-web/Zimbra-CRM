/** HU-15 y HU-16 - Actividad web.
 * Recibe las solicitudes y devuelve las respuestas.
 */
import * as activities from '../service/ActividadWeb.service.js';

// HU-15: Registra una actividad y su puntaje asociado.
export async function create(req, res, next) {
  try { res.status(201).json(await activities.createActivity(req.body, req.user)); } catch (error) {
    console.warn('Evento de actividad rechazado.', { estado: error.status || 500, ruta: req.originalUrl, motivo: error.status ? error.message : 'Error de persistencia' });
    next(error);
  }
}

// HU-15: Recibe hasta 50 actividades y conserva las que pasen sus validaciones.
export async function createBatch(req, res, next) {
  try { res.json(await activities.createActivitiesBatch(req.body, req.user)); } catch (error) { next(error); }
}

// HU-15: Presenta el historial del cliente indicado.
export async function listForClient(req, res, next) {
  try { res.json(await activities.getClientActivities(req.params.id ?? req.query.id_cliente, req.query, req.user)); } catch (error) { next(error); }
}
