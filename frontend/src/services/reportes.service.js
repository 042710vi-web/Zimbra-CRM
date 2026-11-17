import { api } from '../api/client.js';

// HU-29/HU-30: consultar reportes de administración.
export function getReport(token, kind, params = {}) {
  return api(`/reports/${kind}?${new URLSearchParams(params)}`, { token });
}
export function downloadReport(token, kind, params = {}) {
  return api(`/reports/exportar?${new URLSearchParams({ ...params, tipo: kind })}`, { token, responseType: 'blob' });
}
