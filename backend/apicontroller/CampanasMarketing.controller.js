/**
 * Recibe las solicitudes de campanas marketing, las entrega al servicio correspondiente y comunica el resultado.
 */
import * as campanasMarketing from '../service/CampanasMarketing.service.js';

// HU-16/HU-17: Presenta las campañas y sus resultados.
export async function listarCampanasMarketing(req, res, next) {
  try { res.json(await campanasMarketing.listarCampanasMarketing(req.query)); } catch (error) { next(error); }
}

// HU-16: Registra una campaña.
export async function crearCampanaMarketing(req, res, next) {
  try { res.status(201).json(await campanasMarketing.crearCampanaMarketing(req.body)); } catch (error) { next(error); }
}

// HU-17: Actualiza los datos de una campaña.
export async function actualizarCampanaMarketing(req, res, next) {
  try { res.json(await campanasMarketing.actualizarCampanaMarketing(req.body, req.user)); } catch (error) { next(error); }
}

// HU-18: Activa o pausa una campaña.
export async function cambiarEstadoCampanaMarketing(req, res, next) {
  try { res.json(await campanasMarketing.cambiarEstadoCampanaMarketing(req.body, req.user)); } catch (error) { next(error); }
}