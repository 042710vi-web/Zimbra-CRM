import { api } from '../api/client.js';

// HU-25: consultar el historial de interacciones.
export function listInteractions(token, params = {}) {
  return api(`/interactions?${new URLSearchParams(params)}`, { token });
}
export const createInteraction = (token, body) => api('/interactions', { method: 'POST', token, body: JSON.stringify(body) });
export const getTimeline = (token, id_cliente) => api(`/interactions/historial?id_cliente=${id_cliente}`, { token });
export const updateInteraction = (token, body) => api('/interactions/actualizar', { method: 'POST', token, body: JSON.stringify(body) });
