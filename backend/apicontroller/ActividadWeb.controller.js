/**
 * Recibe las solicitudes de actividad web, las entrega al servicio correspondiente y comunica el resultado.
 */
import * as activities from '../service/ActividadWeb.service.js';

// HU-20: Registra una actividad y su puntaje asociado.
export async function create(req, res, next) {
  try { res.status(201).json(await activities.createActivity(req.body, req.user)); } catch (error) { next(error); }
}

// HU-20: Recibe hasta 50 actividades y conserva las que pasen sus validaciones.
export async function createBatch(req, res, next) {
  try { res.json(await activities.createActivitiesBatch(req.body, req.user)); } catch (error) { next(error); }
}

// HU-20: Presenta el historial del cliente indicado.
export async function listForClient(req, res, next) {
  try { res.json(await activities.getClientActivities(req.params.id, req.query, req.user)); } catch (error) { next(error); }
}