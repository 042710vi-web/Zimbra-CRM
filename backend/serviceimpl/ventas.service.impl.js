import { changeSaleStatus as setSaleStatus, createSale, listSales, updateSale } from '../repository/ventas.repository.js';
const fail = (message, status = 400) => Object.assign(new Error(message), { status });
const id = (value, key) => { const n = Number(value); if (!Number.isInteger(n) || n < 1) throw fail(`${key} debe ser entero positivo.`); return n; };
function normalizeItems(items) {
  if (!Array.isArray(items) || !items.length) throw fail('Incluye al menos un producto en items.');
  const result = items.map(item => ({ id_producto: id(item.id_producto, 'id_producto'), cantidad: id(item.cantidad, 'cantidad') }));
  if (new Set(result.map(x => x.id_producto)).size !== result.length) throw fail('No repitas productos; envía una sola línea por producto.');
  return result;
}
export async function getSales(query = {}, user = {}) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1), limit = Math.min(100, Math.max(1, Number.parseInt(query.limit, 10) || 20));
  const filters = {};
  for (const key of ['id_cliente', 'id_vendedor']) if (query[key]) filters[key] = id(query[key], key);
  if (query.estado_venta && !['Pendiente', 'Completada', 'Cancelada'].includes(query.estado_venta)) throw fail('estado_venta no es válido.');
  if (query.estado_venta) filters.estado_venta = query.estado_venta;
  for (const key of ['desde', 'hasta']) if (query[key] && !/^\d{4}-\d{2}-\d{2}$/.test(query[key])) throw fail(`${key} debe tener formato YYYY-MM-DD.`);
  filters.desde = query.desde; filters.hasta = query.hasta;
  if (filters.desde && filters.hasta && filters.desde > filters.hasta) throw fail('desde no puede superar hasta.');
  const id_vendedor = user.role === 'Vendedor' ? id(user.vendorId, 'vendedor') : undefined;
  const result = await listSales({ filters, page, limit, id_vendedor });
  return { data: result.rows, pagination: { page, limit, total: result.count, pages: Math.ceil(result.count / limit) } };
}
export async function registerSale(data = {}) {
  if (typeof data.numero_contrato !== 'string' || !data.numero_contrato.trim()) throw fail('numero_contrato es obligatorio.');
  if (typeof data.metodo_pago !== 'string' || !data.metodo_pago.trim()) throw fail('metodo_pago es obligatorio.');
  return createSale({ id_cliente: id(data.id_cliente, 'id_cliente'), id_vendedor: id(data.id_vendedor, 'id_vendedor'), numero_contrato: data.numero_contrato.trim(), metodo_pago: data.metodo_pago.trim(), items: normalizeItems(data.items) });
}
export async function editSale(data = {}, user = {}) {
  if (!data.id_venta) throw fail('id_venta es obligatorio.');
  return updateSale({ id_venta: id(data.id_venta, 'id_venta'), metodo_pago: data.metodo_pago, items: normalizeItems(data.items), ownerId: user.role === 'Vendedor' ? id(user.vendorId, 'vendedor') : undefined });
}
export async function changeSaleState(data = {}) {
  const estado_venta = data.estado_venta;
  if (!['Completada', 'Cancelada'].includes(estado_venta)) throw fail('estado_venta debe ser Completada o Cancelada.');
  return setSaleStatus({ id_venta: id(data.id_venta, 'id_venta'), estado_venta });
}
