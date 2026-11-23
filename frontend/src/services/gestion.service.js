import { api } from '../api/client.js';

const get = (token, path, params = {}) => api(`${path}?${new URLSearchParams(params)}`, { token });
const post = (token, path, data) => api(path, { token, method: 'POST', body: JSON.stringify(data) });
export const listCompanies = (token, params) => get(token, '/empresas', params);
export const createCompany = (token, data) => post(token, '/empresas', data);
export const getCompany = (token, id_empresa) => get(token, '/empresas', { id_empresa });
export const listAudit = (token, params) => get(token, '/audit', params);
export const listSyncs = (token, params) => get(token, '/salesforce/sincronizaciones', params);
export const syncClient = (token, id_cliente) => post(token, '/salesforce/sincronizar', { id_cliente });
export const retrySync = (token, id_sincronizacion) => post(token, '/salesforce/reintentar', { id_sincronizacion });
export const getDashboard = (token) => get(token, '/dashboard');
