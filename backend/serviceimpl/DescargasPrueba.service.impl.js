import { syncQualifiedClients } from './salesforce.service.impl.js';
/** HU-09 a HU-11 - Descargas de prueba.
 * Revisa los datos y coordina las operaciones del módulo.
 */
import { expireTrials as expire, createTrial as saveTrial, listTrials as readTrials } from '../repository/DescargasPrueba.repository.js';
import { httpError, optionalId, pagination, requireId, requireOneOf } from '../utils/validators.js';

import { sendAutomatedEmail } from '../service/Correos.service.js';

const TRIAL_STATES = ['Activa', 'Vencida', 'Cancelada', 'Convertida'];

/** Comprueba que la fecha exista y tenga el formato año-mes-día. */
function dateValue(value, label) {
  if (!value) return undefined;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw httpError(400, `${label} debe tener formato AAAA-MM-DD.`);
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== value) throw httpError(400, `${label} no es una fecha válida.`);
  return value;
}

// HU-09: Valida los identificadores antes de iniciar el registro de una prueba.
export async function registerTrial(data = {}, user = {}) {
  const id_cliente = requireId(data.id_cliente, 'id_cliente');
  const id_producto = requireId(data.id_producto, 'id_producto');
  const result = await saveTrial({ id_cliente, id_producto, usuario: user.email });
  await syncQualifiedClients([id_cliente]);
  // HU-19: el correo se solicita despues del COMMIT y no revierte la prueba.
  try {
    await sendAutomatedEmail({ id_cliente, id_descarga: result.id_descarga, evento: 'prueba_iniciada', variables: { nombre: result.nombre_cliente, fecha_fin: result.fecha_fin } });
  } catch (error) { console.error('No se pudo enviar la bienvenida de prueba:', error.message); }
  return result;
}

// HU-10: Consulta pruebas y fechas de vencimiento dentro del ámbito autorizado.
export async function listTrials(query = {}, user = {}) {
  const estado_prueba = query.estado_prueba
    ? requireOneOf(query.estado_prueba, 'estado_prueba', TRIAL_STATES)
    : undefined;
  const id_cliente = optionalId(query.id_cliente, 'El cliente');
  const id_producto = optionalId(query.id_producto, 'El producto');
  const vence_desde = dateValue(query.vence_desde ?? query.fecha_fin_desde, 'vence_desde');
  const vence_hasta = dateValue(query.vence_hasta ?? query.fecha_fin_hasta, 'vence_hasta');
  if (vence_desde && vence_hasta && vence_desde > vence_hasta) throw httpError(400, 'vence_desde no puede ser posterior a vence_hasta.');
  return readTrials({
    estado_prueba, id_cliente, id_producto, vence_desde, vence_hasta,
    id_vendedor: user.role === 'Vendedor' ? requireId(user.vendorId, 'El vendedor') : undefined,
    ...pagination(query),
  });
}

// HU-11: Ejecuta manualmente la actualización diaria de pruebas vencidas.
export async function expireTrialDates(user = {}) {
  const { avisos, ...summary } = await expire(user.email || 'administrador');
  let correos_solicitados = 0;
  let correos_fallidos = 0;
  for (const aviso of avisos) {
    try {
      await sendAutomatedEmail({ id_cliente: aviso.id_cliente, id_descarga: aviso.id_descarga, evento: 'prueba_por_vencer', variables: aviso });
      correos_solicitados += 1;
    } catch (error) {
      correos_fallidos += 1;
      console.error('No se pudo enviar el aviso de vencimiento:', error.message);
    }
  }
  return { ...summary, correos_solicitados, correos_fallidos, message: 'Actualizacion de vencimientos completada.' };
}
