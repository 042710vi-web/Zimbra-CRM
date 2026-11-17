import { api } from '../api/client.js';
export const listSellers = (token) => api('/sellers?limit=100', { token });
export const createSeller = (token, body) => api('/sellers', { method: 'POST', token, body: JSON.stringify(body) });
export const updateSeller = (token, body) => api('/sellers/actualizar', { method: 'POST', token, body: JSON.stringify(body) });
export const setSellerState = (token, body) => api('/sellers/cambiar-estado', { method: 'POST', token, body: JSON.stringify(body) });
