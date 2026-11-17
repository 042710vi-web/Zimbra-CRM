/** HU-15 y HU-16 - Actividad web.
 * Revisa los datos y coordina las operaciones del módulo.
 */
import {
  createWebActivity,
  createWebActivitiesBatch,
  listClientActivities,
} from '../repository/ActividadWeb.repository.js';
import { httpError, optionalId, optionalText, pagination, requireId } from '../utils/validators.js';

/** Revisa los datos del evento y exige identificar al cliente o al visitante. */
function activityData(data = {}) {
  const id_cliente = optionalId(data.id_cliente, 'El cliente');
  const clave_rastreo = optionalText(data.clave_rastreo, 'La clave del visitante', 100);
  if (!id_cliente && !clave_rastreo) throw httpError(400, 'Indique el cliente o la clave de rastreo del visitante.');
  return {
    id_cliente,
    clave_rastreo,
    id_accion: requireId(data.id_accion, 'La acción'),
    id_campana: optionalId(data.id_campana, 'La campaña'),
    direccion_origen: optionalText(data.direccion_origen, 'El origen', 255),
    detalle: optionalText(data.detalle, 'El detalle', 255),
  };
}

// HU-15: Registra una actividad válida y devuelve el puntaje aplicado.
export async function createActivity(data = {}, user = {}) {
  return createWebActivity({ ...activityData(data), usuario: user.email });
}

// HU-15: Envía varios eventos; cada dato inválido se rechaza sin perder los eventos válidos.
export async function createActivitiesBatch(data = {}, user = {}) {
  if (!Array.isArray(data.actividades) || data.actividades.length === 0) {
    throw httpError(400, 'actividades debe contener al menos un registro.');
  }
  if (data.actividades.length > 50) throw httpError(400, 'La carga no puede superar 50 actividades por solicitud.');
  return createWebActivitiesBatch({ actividades: data.actividades, usuario: user.email });
}

// HU-15: Consulta el historial respetando el vendedor responsable.
export async function getClientActivities(idValue, query = {}, user = {}) {
  const id_cliente = requireId(idValue, 'El cliente');
  return listClientActivities({
    id_cliente,
    id_vendedor: user.role === 'Vendedor' ? requireId(user.vendorId, 'El vendedor') : undefined,
    ...pagination(query),
  });
}
