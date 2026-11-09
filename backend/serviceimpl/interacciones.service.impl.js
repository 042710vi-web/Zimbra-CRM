/**
 * Valida los datos y coordina las operaciones necesarias para gestionar interacciones.
 */
import { createInteraction as saveInteraction, listInteractions } from '../repository/Interacciones.repository.js';
/** Apoya la gestión de interacciones mediante una tarea interna del sistema. */
const fail = (message, status = 400) => Object.assign(new Error(message), { status });
/** Apoya la gestión de interacciones mediante una tarea interna del sistema. */
const positiveId = (value, name) => { const n = Number(value); if (!Number.isInteger(n) || n < 1) throw fail(`${name} debe ser un entero positivo.`); return n; };
/** Aplica las validaciones y coordina esta operación antes de guardar o consultar información. */
export async function getInteractions(query = {}, user = {}) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(query.limit, 10) || 20));
  const id_vendedor = user.role === 'Vendedor' ? positiveId(user.vendorId, 'vendedor') : (query.id_vendedor ? positiveId(query.id_vendedor, 'id_vendedor') : undefined);
  const result = await listInteractions({ id_vendedor, id_asignacion: query.id_asignacion ? positiveId(query.id_asignacion, 'id_asignacion') : undefined, tipo_interaccion: query.tipo_interaccion, page, limit });
  return { data: result.rows, pagination: { page, limit, total: result.count, pages: Math.ceil(result.count / limit) } };
}
/** Aplica las validaciones y coordina esta operación antes de guardar o consultar información. */
export async function createInteraction(data = {}, user = {}) {
  const id_asignacion = positiveId(data.id_asignacion, 'id_asignacion');
  const allowed = ['Llamada', 'Correo', 'Meeting', 'Alerta Automática'];
  if (!allowed.includes(data.tipo_interaccion)) throw fail(`tipo_interaccion debe ser uno de: ${allowed.join(', ')}.`);
  if (typeof data.resultado !== 'string' || !data.resultado.trim()) throw fail('resultado es obligatorio.');
  return saveInteraction({ id_asignacion, tipo_interaccion: data.tipo_interaccion, resultado: data.resultado.trim(), notas: data.notas, id_vendedor: user.role === 'Vendedor' ? positiveId(user.vendorId, 'vendedor') : undefined });
}