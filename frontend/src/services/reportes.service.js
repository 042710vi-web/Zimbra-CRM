import { api } from '../api/client.js';

// HU-29/HU-30: consultar reportes de administración.
export function getReport(token, kind, params = {}) {
  return api(`/reports/${kind}?${new URLSearchParams(params)}`, { token });
}
