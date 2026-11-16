import { listEmails, retryEmail, sendAutomatedEmail as sendEmail } from '../repository/correos.repository.js';
const invalid = (message) => Object.assign(new Error(message), { status: 400 });
export async function getEmails(query = {}) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(query.limit, 10) || 20));
  if (query.estado && !['Pendiente', 'Enviado', 'Fallido'].includes(query.estado)) throw invalid('estado no es válido.');
  const id_cliente = query.id_cliente ? Number(query.id_cliente) : undefined;
  if (id_cliente && (!Number.isInteger(id_cliente) || id_cliente < 1)) throw invalid('id_cliente debe ser entero positivo.');
  const result = await listEmails({ estado: query.estado, id_cliente, page, limit });
  return { data: result.rows, pagination: { page, limit, total: result.count, pages: Math.ceil(result.count / limit) } };
}
export async function retryFailedEmail(data = {}) {
  const id = Number(data.id_correo);
  if (!Number.isInteger(id) || id < 1) throw invalid('id_correo debe ser entero positivo.');
  return retryEmail(id);
}
export async function sendAutomatedEmail(data = {}) {
  const id_cliente = Number(data.id_cliente);
  if (!Number.isInteger(id_cliente) || id_cliente < 1) throw invalid('id_cliente debe ser entero positivo.');
  if (typeof data.evento !== 'string' || !data.evento.trim()) throw invalid('evento es obligatorio.');
  return sendEmail({ id_cliente, evento: data.evento.trim(), variables: data.variables || {} });
}
