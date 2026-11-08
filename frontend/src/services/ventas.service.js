import { api } from '../api/client.js';

// HU-28: registrar ventas con su detalle de productos.
// Endpoint: POST /api/sales.
export function createSale(token, data) {
  return api('/sales', { method: 'POST', token, body: JSON.stringify(data) });
}
