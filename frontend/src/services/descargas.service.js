import { api } from '../api/client.js';

// HU-13: registrar descargas de la versión de prueba.
// Endpoint: POST /api/trials.
export function createTrial(token, data) {
  return api('/trials', { method: 'POST', token, body: JSON.stringify(data) });
}
