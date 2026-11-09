/**
 * Valida los datos y coordina las operaciones necesarias para gestionar actividad web.
 */
import {
  createWebActivity,
  listClientActivities,
} from '../repository/ActividadWeb.repository.js';
import { httpError, optionalId, optionalText, pagination, requireId } from '../utils/validators.js';

/** Apoya la gestión de actividadweb mediante una tarea interna del sistema. */
function activityData(data = {}) {
  return {
    id_cliente: requireId(data.id_cliente, 'El cliente'),
    id_accion: requireId(data.id_accion, 'La acción'),
    id_campana: optionalId(data.id_campana, 'La campaña'),
    direccion_origen: optionalText(data.direccion_origen, 'El origen', 255),
    detalle: optionalText(data.detalle, 'El detalle', 255),
  };
}

// HU-20: Registra una actividad válida y devuelve el puntaje aplicado.
export async function createActivity(data = {}, user = {}) {
  return createWebActivity({ ...activityData(data), usuario: user.email });
}

// HU-20: Procesa cada elemento por separado y conserva los válidos si otro falla.
export async function createActivitiesBatch(data = {}, user = {}) {
  if (!Array.isArray(data.actividades) || data.actividades.length === 0) {
    throw httpError(400, 'actividades debe contener al menos un registro.');
  }
  if (data.actividades.length > 50) throw httpError(400, 'La carga no puede superar 50 actividades por solicitud.');
  const aceptadas = [];
  const rechazadas = [];
  for (let index = 0; index < data.actividades.length; index += 1) {
    try {
      aceptadas.push({ indice: index, ...(await createActivity(data.actividades[index], user)) });
    } catch (error) {
      rechazadas.push({ indice: index, mensaje: error.status ? error.message : 'No fue posible guardar esta actividad.' });
    }
  }
  return { total: data.actividades.length, aceptadas, rechazadas };
}

// HU-20: Consulta el historial respetando el vendedor responsable.
export async function getClientActivities(idValue, query = {}, user = {}) {
  const id_cliente = requireId(idValue, 'El cliente');
  return listClientActivities({
    id_cliente,
    id_vendedor: user.role === 'Vendedor' ? requireId(user.vendorId, 'El vendedor') : undefined,
    ...pagination(query),
  });
}