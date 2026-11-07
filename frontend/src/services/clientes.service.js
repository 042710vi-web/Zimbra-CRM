import { api } from '../api/client.js';

// HU-05: registrar nuevos clientes.
// Endpoint: POST /api/clients.
export function createClient(token, data) {
  return api('/clients', { method: 'POST', token, body: JSON.stringify(data) });
}
