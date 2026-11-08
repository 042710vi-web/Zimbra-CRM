import { api } from '../api/client.js';

// HU-22: consultar vendedores para la administración y asignación de prospectos.
export function listVendors(token, params = {}) {
  return api(`/vendors?${new URLSearchParams(params)}`, { token });
}
