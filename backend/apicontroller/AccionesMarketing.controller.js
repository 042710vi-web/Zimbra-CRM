/**
 * Recibe las solicitudes de acciones marketing, las entrega al servicio correspondiente y comunica el resultado.
 */
import * as marketingActions from '../service/AccionesMarketing.service.js';
import * as scoring from '../service/MarketingScoring.service.js';

// HU-19: Presenta las acciones disponibles y las veces registradas.
export async function list(req, res, next) {
  try { res.json(await marketingActions.listMarketingActions(req.query)); } catch (error) { next(error); }
}

// HU-19: Registra una acción de marketing.
export async function create(req, res, next) {
  try { res.status(201).json(await marketingActions.createMarketingAction(req.body)); } catch (error) { next(error); }
}

// HU-19: Modifica el nombre o el puntaje de una acción.
export async function update(req, res, next) {
  try { res.json(await marketingActions.editMarketingAction(req.body, req.user)); } catch (error) { next(error); }
}

// HU-19: Activa o pausa una acción.
export async function changeStatus(req, res, next) {
  try { res.json(await marketingActions.changeMarketingActionState(req.body, req.user)); } catch (error) { next(error); }
}

// HU-21: Vuelve a calcular los puntajes desde el historial.
export async function recalculate(_req, res, next) {
  try { res.json(await scoring.recalculateLeadScores(_req.user)); } catch (error) { next(error); }
}