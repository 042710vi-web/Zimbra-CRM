/** HU-12 y HU-13 - Campañas.
 * Recibe las solicitudes y devuelve las respuestas.
 */
import * as campanasMarketing from '../service/CampanasMarketing.service.js';

// HU-12: Registra una campaña.
export async function crearCampanaMarketing(req, res, next) {
  try { res.status(201).json(await campanasMarketing.crearCampanaMarketing(req.body, req.user)); } catch (error) { next(error); }
}

// HU-13: Presenta las campañas y sus resultados.
export async function listarCampanasMarketing(req, res, next) {
  try { res.json(await campanasMarketing.listarCampanasMarketing(req.query)); } catch (error) { next(error); }
}

// HU-13: Actualiza los datos de una campaña.
export async function actualizarCampanaMarketing(req, res, next) {
  try { res.json(await campanasMarketing.actualizarCampanaMarketing(req.body, req.user)); } catch (error) { next(error); }
}

// HU-13: Activa o pausa una campaña.
export async function cambiarEstadoCampanaMarketing(req, res, next) {
  try { res.json(await campanasMarketing.cambiarEstadoCampanaMarketing(req.body, req.user)); } catch (error) { next(error); }
}
