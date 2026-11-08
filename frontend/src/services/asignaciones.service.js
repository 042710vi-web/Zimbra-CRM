import { api } from '../api/client.js';

// HU-23: asignar clientes a vendedores responsables.
// Endpoint: POST /api/assignments.
export function createAssignment(token, data) {
  return api('/assignments', { method: 'POST', token, body: JSON.stringify(data) });
}

// HU-24: consultar asignaciones e historial.
export function listAssignments(token, params = {}) {
  return api(`/assignments?${new URLSearchParams(params)}`, { token });
}
