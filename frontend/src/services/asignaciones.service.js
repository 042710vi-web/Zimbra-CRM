import { api } from '../api/client.js';

// HU-21: asignar clientes a vendedores responsables.
// Endpoint: POST /api/assignments.
export function createAssignment(token, data) {
  return api('/assignments', { method: 'POST', token, body: JSON.stringify(data) });
}
export const createAssignmentsBatch = (token, data) => api('/assignments/lote', { method: 'POST', token, body: JSON.stringify(data) });
export const takeProspect = (token, id_cliente) => api('/assignments/tomar', { method: 'POST', token, body: JSON.stringify({ id_cliente }) });
export const reassignClient = (token, body) => api('/assignments/reasignar', { method: 'POST', token, body: JSON.stringify(body) });
export const finishAssignment = (token, id_asignacion) => api('/assignments/finalizar', { method: 'POST', token, body: JSON.stringify({ id_asignacion }) });

// HU-22: consultar asignaciones e historial.
export function listAssignments(token, params = {}) {
  return api(`/assignments?${new URLSearchParams(params)}`, { token });
}
