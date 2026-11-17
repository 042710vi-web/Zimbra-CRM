/** HU-14 - Acciones de marketing.
 * Recibe las solicitudes y devuelve las respuestas.
 */
import * as marketingActions from '../service/AccionesMarketing.service.js';

// HU-14: Presenta las acciones disponibles y las veces registradas.
export async function list(req, res, next) {
  try { res.json(await marketingActions.listMarketingActions(req.query)); } catch (error) { next(error); }
}

// HU-14: Registra una acción de marketing.
export async function create(req, res, next) {
  try { res.status(201).json(await marketingActions.createMarketingAction(req.body, req.user)); } catch (error) { next(error); }
}

// HU-14: Modifica el nombre o el puntaje de una acción.
export async function update(req, res, next) {
  try { res.json(await marketingActions.editMarketingAction(req.body, req.user)); } catch (error) { next(error); }
}

// HU-14: Activa o pausa una acción.
export async function changeStatus(req, res, next) {
  try { res.json(await marketingActions.changeMarketingActionState(req.body, req.user)); } catch (error) { next(error); }
}

