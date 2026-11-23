import { api } from '../api/client.js';

export const queryString = (params = {}) => new URLSearchParams(Object.entries(params).filter(([, value]) => value !== '' && value != null)).toString();
export const readModule = (token, path, params = {}, signal) => api(`${path}?${queryString(params)}`, { token, signal });
export const saveModule = (token, path, body) => api(path, { token, method: 'POST', body: JSON.stringify(body) });
export const attendAlert = (token, body) => saveModule(token, '/alerts/atender', body);

export function pageInfo(result, fallbackPage = 1) {
  const meta = result?.pagination || result || {};
  return { page: Number(meta.page || fallbackPage), total: Number(meta.total || 0), pages: Math.max(1, Number(meta.pages || meta.totalPages || 1)) };
}

export async function allOptions(token, path, params = {}, signal) {
  const rows = [];
  let pages = 1;
  for (let page = 1; page <= pages; page += 1) {
    const result = await readModule(token, path, { ...params, page, limit: 100 }, signal);
    if (Array.isArray(result)) return result;
    if (!Array.isArray(result?.data)) throw new Error('El servidor devolvió un listado con formato inesperado.');
    rows.push(...result.data);
    pages = pageInfo(result, page).pages;
    if (!result.data.length) break;
  }
  return rows;
}
