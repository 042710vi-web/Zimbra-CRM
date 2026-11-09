/**
 * Valida los datos y coordina las operaciones necesarias para gestionar descargas prueba.
 */
import { expireTrials as expire, createTrial as saveTrial, listTrials as readTrials } from '../repository/DescargasPrueba.repository.js';
import { httpError, optionalId, pagination, requireId, requireOneOf } from '../utils/validators.js';

const TRIAL_STATES = ['Activa', 'Vencida', 'Cancelada', 'Convertida'];

/** Apoya la gestión de descargasprueba mediante una tarea interna del sistema. */
function dateValue(value, label) {
  if (!value) return undefined;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw httpError(400, `${label} debe tener formato AAAA-MM-DD.`);
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== value) throw httpError(400, `${label} no es una fecha válida.`);
  return value;
}

// HU-13: Valida los identificadores antes de iniciar el registro de una prueba.
export async function registerTrial(data = {}, user = {}) {
  const id_cliente = requireId(data.id_cliente, 'id_cliente');
  const id_producto = requireId(data.id_producto, 'id_producto');
  return saveTrial({ id_cliente, id_producto, usuario: user.email });
}

// HU-14: Consulta pruebas y fechas de vencimiento dentro del ámbito autorizado.
export async function listTrials(query = {}, user = {}) {
  const estado_prueba = query.estado_prueba
    ? requireOneOf(query.estado_prueba, 'estado_prueba', TRIAL_STATES)
    : undefined;
  const id_cliente = optionalId(query.id_cliente, 'El cliente');
  const id_producto = optionalId(query.id_producto, 'El producto');
  const vence_desde = dateValue(query.vence_desde, 'vence_desde');
  const vence_hasta = dateValue(query.vence_hasta, 'vence_hasta');
  if (vence_desde && vence_hasta && vence_desde > vence_hasta) throw httpError(400, 'vence_desde no puede ser posterior a vence_hasta.');
  return readTrials({
    estado_prueba, id_cliente, id_producto, vence_desde, vence_hasta,
    id_vendedor: user.role === 'Vendedor' ? requireId(user.vendorId, 'El vendedor') : undefined,
    ...pagination(query),
  });
}

// HU-15: Ejecuta manualmente la actualización diaria de pruebas vencidas.
export async function expireTrialDates(user = {}) {
  return { ...(await expire(user.email || 'administrador')), message: 'Actualización de vencimientos completada.' };
}