import { api } from '../api/client.js';

// HU-27: consultar el historial de interacciones.
export function listInteractions(token, params = {}) {
  return api(`/interactions?${new URLSearchParams(params)}`, { token });
}
