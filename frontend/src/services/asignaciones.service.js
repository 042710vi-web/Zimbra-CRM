import { api } from '../api/client.js';

// HU: pendiente de documentar al recibir las historias de usuario.
// Endpoint asociado: pendiente de confirmar con su historia de usuario.
export function createAssignment(token, data) {
  return api('/assignments', { method: 'POST', token, body: JSON.stringify(data) });
}
