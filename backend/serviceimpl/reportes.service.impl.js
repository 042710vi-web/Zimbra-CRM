/**
 * Valida los datos y coordina las operaciones necesarias para gestionar reportes.
 */
import {
  getCampaignsReport as campaignsRepository,
  getClientsReport as clientsRepository,
  getInteractionsReport as interactionsRepository,
  getSalesReport as salesRepository,
} from '../repository/Reportes.repository.js';

/** Apoya la gestión de reportes mediante una tarea interna del sistema. */
const fail = (message, status = 400) => Object.assign(new Error(message), { status });
/** Apoya la gestión de reportes mediante una tarea interna del sistema. */
const positiveInt = (value, field) => {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 1) throw fail(`${field} debe ser un entero positivo.`);
  return number;
};
/** Apoya la gestión de reportes mediante una tarea interna del sistema. */
function validDate(value, field) {
  if (!value) return undefined;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`))) throw fail(`${field} debe tener formato YYYY-MM-DD.`);
  return value;
}
/** Apoya la gestión de reportes mediante una tarea interna del sistema. */
function defaultPeriod(query = {}) {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const monthStart = `${today.slice(0, 7)}-01`;
  const desde = validDate(query.desde, 'desde') || monthStart;
  const hasta = validDate(query.hasta, 'hasta') || today;
  if (desde > hasta) throw fail('desde no puede ser posterior a hasta.');
  return { desde, hasta };
}
/** Apoya la gestión de reportes mediante una tarea interna del sistema. */
function ensureAdmin(user) {
  if (user?.role !== 'Administrador') throw fail('Solo un Administrador puede consultar reportes.', 403);
}

/** Aplica las validaciones y coordina esta operación antes de guardar o consultar información. */
export async function salesReport(query = {}, user) {
  ensureAdmin(user);
  const period = defaultPeriod(query);
  const filters = { ...period };
  if (query.estado_venta) {
    if (!['Pendiente', 'Completada', 'Cancelada'].includes(query.estado_venta)) throw fail('estado_venta no está permitido.');
    filters.estado_venta = query.estado_venta;
  }
  if (query.id_cliente) filters.id_cliente = positiveInt(query.id_cliente, 'id_cliente');
  if (query.id_vendedor) filters.id_vendedor = positiveInt(query.id_vendedor, 'id_vendedor');
  if (query.id_producto) filters.id_producto = positiveInt(query.id_producto, 'id_producto');
  const result = await salesRepository(filters);
  return { filtros: filters, ...result };
}

/** Aplica las validaciones y coordina esta operación antes de guardar o consultar información. */
export async function clientsReport(query = {}, user) {
  ensureAdmin(user);
  const period = defaultPeriod(query);
  return { filtros: period, ...(await clientsRepository(period)) };
}

/** Aplica las validaciones y coordina esta operación antes de guardar o consultar información. */
export async function campaignsReport(query = {}, user) {
  ensureAdmin(user);
  const period = defaultPeriod(query);
  return { filtros: period, ...(await campaignsRepository(period)) };
}

/** Aplica las validaciones y coordina esta operación antes de guardar o consultar información. */
export async function interactionsReport(query = {}, user) {
  ensureAdmin(user);
  const period = defaultPeriod(query);
  const id_vendedor = query.id_vendedor ? positiveInt(query.id_vendedor, 'id_vendedor') : undefined;
  const umbral_dias = query.umbral_dias === undefined ? 7 : positiveInt(query.umbral_dias, 'umbral_dias');
  if (umbral_dias > 365) throw fail('umbral_dias no puede superar 365.');
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(query.limit, 10) || 20));
  const data = await interactionsRepository({ ...period, id_vendedor, umbral_dias, page, limit });
  return {
    filtros: { ...period, id_vendedor, umbral_dias },
    pagination: { page, limit, total: data.total_seguimiento, pages: Math.ceil(data.total_seguimiento / limit) },
    ...data,
  };
}