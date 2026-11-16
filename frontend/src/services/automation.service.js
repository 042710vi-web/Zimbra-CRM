import { api } from '../api/client.js';
export const listTemplates = (token) => api('/email-templates', { token });
export const createTemplate = (token, body) => api('/email-templates', { method: 'POST', token, body: JSON.stringify(body) });
export const updateTemplate = (token, body) => api('/email-templates/actualizar', { method: 'POST', token, body: JSON.stringify(body) });
export const setTemplateState = (token, body) => api('/email-templates/cambiar-estado', { method: 'POST', token, body: JSON.stringify(body) });
export const listEmails = (token, params = {}) => api(`/emails?${new URLSearchParams(params)}`, { token });
export const retryEmail = (token, id_correo) => api('/emails/reintentar', { method: 'POST', token, body: JSON.stringify({ id_correo }) });
