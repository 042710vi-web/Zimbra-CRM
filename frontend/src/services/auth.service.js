import { api } from '../api/client.js';

// HU: pendiente de documentar al recibir las historias de usuario.
// Endpoint asociado: pendiente de confirmar con su historia de usuario.
export function login(credentials) {
  return api('/auth/login', { method: 'POST', body: JSON.stringify(credentials) });
}
