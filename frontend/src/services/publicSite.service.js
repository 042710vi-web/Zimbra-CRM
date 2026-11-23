import { api } from '../api/client.js';

export const getPublicCatalog = () => api('/public/catalog');
export const registerPublicLead = (data) => api('/public/leads', { method: 'POST', body: JSON.stringify(data) });
export const registerPublicTrial = (data) => api('/public/descargas', { method: 'POST', body: JSON.stringify(data) });
export const recordPublicActivity = (data) => api('/public/activities', { method: 'POST', body: JSON.stringify(data) });
