import { api } from '../api/client.js';

// HU-01: iniciar y cerrar sesión.
// Endpoint: POST /api/auth/login.
export function login(credentials) {
  return api('/auth/login', { method: 'POST', body: JSON.stringify(credentials) });
}
export function requestPasswordReset(email) {
  return api('/auth/recuperar', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export function resetPassword(data) {
  return api('/auth/restablecer', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
