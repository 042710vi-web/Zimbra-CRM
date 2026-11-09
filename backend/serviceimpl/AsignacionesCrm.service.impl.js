/**
 * Valida los datos y coordina las operaciones necesarias para gestionar asignaciones crm.
 */
import { createAssignment, finishAssignment, listAssignments, reassignClient } from '../repository/AsignacionesCrm.repository.js';
/** Apoya la gestión de asignacionescrm mediante una tarea interna del sistema. */
const fail = (message, status = 400) => Object.assign(new Error(message), { status });
/** Apoya la gestión de asignacionescrm mediante una tarea interna del sistema. */
const id = (value, key) => { const n = Number(value); if (!Number.isInteger(n) || n < 1) throw fail(`${key} debe ser entero positivo.`); return n; };
/** Aplica las validaciones y coordina esta operación antes de guardar o consultar información. */
export async function getAssignments(query = {}, user = {}) {
  if (query.estado && !['Activa', 'Finalizada'].includes(query.estado)) throw fail('estado debe ser Activa o Finalizada.');
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1), limit = Math.min(100, Math.max(1, Number.parseInt(query.limit, 10) || 20));
  const id_vendedor = user.role === 'Vendedor' ? id(user.vendorId, 'vendedor') : query.id_vendedor ? id(query.id_vendedor, 'id_vendedor') : undefined;
  const result = await listAssignments({ id_vendedor, estado: query.estado, page, limit });
  return { data: result.rows, pagination: { page, limit, total: result.count, pages: Math.ceil(result.count / limit) } };
}
/** Aplica las validaciones y coordina esta operación antes de guardar o consultar información. */
export async function assignClient(data = {}, user = {}) { return createAssignment({ id_cliente: id(data.id_cliente, 'id_cliente'), id_vendedor: id(data.id_vendedor, 'id_vendedor'), usuario: user.email }); }
/** Aplica las validaciones y coordina esta operación antes de guardar o consultar información. */
export async function reassign(data = {}, user = {}) { return reassignClient({ id_cliente: id(data.id_cliente, 'id_cliente'), id_vendedor: id(data.id_vendedor, 'id_vendedor'), usuario: user.email }); }
/** Aplica las validaciones y coordina esta operación antes de guardar o consultar información. */
export async function finish(data = {}, user = {}) { return finishAssignment({ id_asignacion: id(data.id_asignacion, 'id_asignacion'), usuario: user.email }); }