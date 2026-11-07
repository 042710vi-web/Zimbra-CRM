import { api } from '../api/client.js';

// HU-01: inicio de sesión.
// Endpoint: POST /api/auth/login.
export function login(credentials) {
  return api('/auth/login', { method: 'POST', body: JSON.stringify(credentials) });
}
