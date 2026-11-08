import { api } from '../api/client.js';

// HU-32/HU-33: consultar reportes de administración.
export function getReport(token, kind, params = {}) {
  return api(`/reports/${kind}?${new URLSearchParams(params)}`, { token });
}
