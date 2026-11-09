/**
 * Valida los datos y coordina las operaciones necesarias para gestionar vendedores.
 */
import { createVendor as saveVendor, listVendors } from '../repository/Vendedores.repository.js';

/** Apoya la gestión de vendedores mediante una tarea interna del sistema. */
const badRequest = (message) => Object.assign(new Error(message), { status: 400 });
/** Aplica las validaciones y coordina esta operación antes de guardar o consultar información. */
export async function getVendors(query = {}) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(query.limit, 10) || 20));
  const result = await listVendors({ search: String(query.search || '').trim(), page, limit });
  return { data: result.rows, pagination: { page, limit, total: result.count, pages: Math.ceil(result.count / limit) } };
}
/** Aplica las validaciones y coordina esta operación antes de guardar o consultar información. */
export async function createVendor(data = {}) {
  if (typeof data.nombre_vendedor !== 'string' || !data.nombre_vendedor.trim()) throw badRequest('nombre_vendedor es obligatorio.');
  if (typeof data.correo_vendedor !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.correo_vendedor)) throw badRequest('correo_vendedor debe ser un correo válido.');
  return saveVendor(data);
}