import { api } from '../api/client.js';

// HU-04: registrar nuevos clientes.
// Endpoint: POST /api/clients.
export function createClient(token, data) {
  return api('/clients', { method: 'POST', token, body: JSON.stringify(data) });
}

// HU-05: consultar clientes registrados con búsqueda y paginación.
export function listClients(token, params = {}) {
  const query = new URLSearchParams(params);
  return api(`/clients?${query.toString()}`, { token });
}

export const getClient = (token, id_cliente) => api(`/clients/detalle?${new URLSearchParams({ id_cliente })}`, { token });
export const updateClient = (token, data) => api('/clients/actualizar', { method: 'POST', token, body: JSON.stringify(data) });
export const changeClientStatus = (token, id_cliente, estado_cliente) => api('/clients/cambiar-estado', { method: 'POST', token, body: JSON.stringify({ id_cliente, estado_cliente }) });
