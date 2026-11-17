/** HU-14 - Acciones de marketing.
 * Revisa los datos y coordina las operaciones del módulo.
 */
import {
  changeMarketingActionStatus,
  createMarketingAction as saveMarketingAction,
  listMarketingActions as readMarketingActions,
  updateMarketingAction,
} from '../repository/AccionesMarketing.repository.js';
import { httpError, pagination, requireId, requireText } from '../utils/validators.js';

/** Interpreta si el elemento debe quedar activo o inactivo y rechaza valores no permitidos. */
function parseState(value) {
  if (value === undefined || value === null || value === '') return undefined;
  if ([true, 1, '1', 'true', 'activa', 'Activa'].includes(value)) return true;
  if ([false, 0, '0', 'false', 'inactiva', 'Inactiva'].includes(value)) return false;
  throw httpError(400, 'estado debe ser activo o inactivo.');
}

/** Comprueba el nombre de la acción y que su puntaje sea un entero entre 0 y 100. */
function actionData(data = {}) {
  const nombre_accion = requireText(data.nombre_accion, 'El nombre de la acción', 100);
  if (data.puntaje === null || data.puntaje === '' || typeof data.puntaje === 'boolean') throw httpError(400, 'El puntaje debe ser un número entero entre 0 y 100.');
  const puntaje = Number(data.puntaje);
  if (!Number.isInteger(puntaje) || puntaje < 0 || puntaje > 100) {
    throw httpError(400, 'El puntaje debe ser un número entero entre 0 y 100.');
  }
  return { nombre_accion, puntaje };
}

// HU-14: Consulta acciones con su puntaje y el número de usos.
export async function listMarketingActions(query = {}) {
  return readMarketingActions({
    q: String(query.q || '').trim(),
    estado: parseState(query.estado),
    ...pagination(query),
  });
}

// HU-14: Crea una acción disponible para futuras actividades.
export async function createMarketingAction(data = {}, user = {}) {
  const id_accion = await saveMarketingAction(actionData(data), user.email);
  return { id_accion, message: 'Acción de marketing registrada correctamente.' };
}

// HU-14: Actualiza el puntaje futuro sin alterar el historial ya registrado.
export async function editMarketingAction(data = {}, user = {}) {
  const id_accion = requireId(data.id_accion, 'La acción');
  await updateMarketingAction({ id_accion, ...actionData(data) }, user.email);
  return { id_accion, message: 'Acción de marketing actualizada correctamente.' };
}

// HU-14: Cambia la disponibilidad de la acción sin borrar su historial.
export async function changeMarketingActionState(data = {}, user = {}) {
  const id_accion = requireId(data.id_accion, 'La acción');
  const estado = parseState(data.estado);
  if (estado === undefined) throw httpError(400, 'estado es obligatorio.');
  await changeMarketingActionStatus({ id_accion, estado }, user.email);
  return { id_accion, estado, message: 'Estado de la acción actualizado correctamente.' };
}
