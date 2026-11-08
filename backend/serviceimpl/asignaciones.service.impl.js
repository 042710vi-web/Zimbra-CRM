import { createAssignment, finishAssignment, listAssignments, reassignClient } from '../repository/asignaciones.repository.js';
const fail = (message, status = 400) => Object.assign(new Error(message), { status });
const id = (value, key) => { const n = Number(value); if (!Number.isInteger(n) || n < 1) throw fail(`${key} debe ser entero positivo.`); return n; };
export async function getAssignments(query = {}, user = {}) {
  if (query.estado && !['Activa', 'Finalizada'].includes(query.estado)) throw fail('estado debe ser Activa o Finalizada.');
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1), limit = Math.min(100, Math.max(1, Number.parseInt(query.limit, 10) || 20));
  const id_vendedor = user.role === 'Vendedor' ? id(user.vendorId, 'vendedor') : query.id_vendedor ? id(query.id_vendedor, 'id_vendedor') : undefined;
  const result = await listAssignments({ id_vendedor, estado: query.estado, page, limit });
  return { data: result.rows, pagination: { page, limit, total: result.count, pages: Math.ceil(result.count / limit) } };
}
export async function assignClient(data = {}) { return createAssignment({ id_cliente: id(data.id_cliente, 'id_cliente'), id_vendedor: id(data.id_vendedor, 'id_vendedor') }); }
export async function reassign(data = {}) { return reassignClient({ id_cliente: id(data.id_cliente, 'id_cliente'), id_vendedor: id(data.id_vendedor, 'id_vendedor') }); }
export async function finish(data = {}) { return finishAssignment({ id_asignacion: id(data.id_asignacion, 'id_asignacion') }); }
