/**
 * Valida los datos y coordina las operaciones necesarias para gestionar acciones marketing.
 */
import {
  changeMarketingActionStatus,
  createMarketingAction as saveMarketingAction,
  listMarketingActions as readMarketingActions,
  updateMarketingAction,
} from '../repository/AccionesMarketing.repository.js';
import { httpError, pagination, requireId, requireText } from '../utils/validators.js';

/** Apoya la gestión de accionesmarketing mediante una tarea interna del sistema. */
function parseState(value) {
  if (value === undefined || value === null || value === '') return undefined;
  if ([true, 1, '1', 'true', 'activa', 'Activa'].includes(value)) return true;
  if ([false, 0, '0', 'false', 'inactiva', 'Inactiva'].includes(value)) return false;
  throw httpError(400, 'estado debe ser activo o inactivo.');
}

/** Apoya la gestión de accionesmarketing mediante una tarea interna del sistema. */
function actionData(data = {}) {
  const nombre_accion = requireText(data.nombre_accion, 'El nombre de la acción', 100);
  const puntaje = Number(data.puntaje);
  if (!Number.isInteger(puntaje) || puntaje < 0 || puntaje > 100) {
    throw httpError(400, 'El puntaje debe ser un número entero entre 0 y 100.');
  }
  return { nombre_accion, puntaje };
}

// HU-19: Consulta acciones con su puntaje y el número de usos.
export async function listMarketingActions(query = {}) {
  return readMarketingActions({
    q: String(query.q || '').trim(),
    estado: parseState(query.estado),
    ...pagination(query),
  });
}

// HU-19: Crea una acción disponible para futuras actividades.
export async function createMarketingAction(data = {}) {
  const id_accion = await saveMarketingAction(actionData(data));
  return { id_accion, message: 'Acción de marketing registrada correctamente.' };
}

// HU-19: Actualiza el puntaje futuro sin alterar el historial ya registrado.
export async function editMarketingAction(data = {}, user = {}) {
  const id_accion = requireId(data.id_accion, 'La acción');
  await updateMarketingAction({ id_accion, ...actionData(data) }, user.email);
  return { id_accion, message: 'Acción de marketing actualizada correctamente.' };
}

// HU-19: Cambia la disponibilidad de la acción sin borrar su historial.
export async function changeMarketingActionState(data = {}, user = {}) {
  const id_accion = requireId(data.id_accion, 'La acción');
  const estado = parseState(data.estado);
  if (estado === undefined) throw httpError(400, 'estado es obligatorio.');
  await changeMarketingActionStatus({ id_accion, estado }, user.email);
  return { id_accion, estado, message: 'Estado de la acción actualizado correctamente.' };
}