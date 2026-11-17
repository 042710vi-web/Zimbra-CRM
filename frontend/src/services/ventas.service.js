import { api } from '../api/client.js';

// HU-26: registrar ventas con su detalle de productos.
// Endpoint: POST /api/sales.
export function createSale(token, data) {
  return api('/sales', { method: 'POST', token, body: JSON.stringify(data) });
}

// HU-27: consultar ventas con sus detalles y filtros.
export function listSales(token, params = {}) {
  return api(`/sales?${new URLSearchParams(params)}`, { token });
}
export const getSaleDetail = (token, id_venta) => api(`/sales/detalle?id_venta=${id_venta}`, { token });
export const updateSale = (token, body) => api('/sales/actualizar', { method: 'POST', token, body: JSON.stringify(body) });
export const changeSaleState = (token, body) => api('/sales/cambiar-estado', { method: 'POST', token, body: JSON.stringify(body) });
