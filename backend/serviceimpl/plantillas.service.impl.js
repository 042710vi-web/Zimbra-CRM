import { createTemplate as insertTemplate, listTemplates, setTemplateState, updateTemplate } from '../repository/plantillas.repository.js';

const invalid = (message) => Object.assign(new Error(message), { status: 400 });
const id = (value) => { const n = Number(value); if (!Number.isInteger(n) || n < 1) throw invalid('id_plantilla debe ser entero positivo.'); return n; };

export const getTemplates = () => listTemplates();
export async function createEmailTemplate(data = {}) {
  for (const key of ['evento', 'nombre_plantilla', 'asunto', 'cuerpo']) if (typeof data[key] !== 'string' || !data[key].trim()) throw invalid(`${key} es obligatorio.`);
  if (data.estado !== undefined && typeof data.estado !== 'boolean') throw invalid('estado debe ser booleano.');
  return insertTemplate({ ...data, evento: data.evento.trim(), nombre_plantilla: data.nombre_plantilla.trim(), asunto: data.asunto.trim(), cuerpo: data.cuerpo.trim() });
}
export async function editEmailTemplate(data = {}) {
  const id_plantilla = id(data.id_plantilla);
  if (!data.asunto && !data.cuerpo && !data.nombre_plantilla) throw invalid('Envía al menos un campo para actualizar.');
  return updateTemplate({ ...data, id_plantilla });
}
export async function changeEmailTemplateState(data = {}) {
  if (typeof data.estado !== 'boolean') throw invalid('estado debe ser booleano.');
  return setTemplateState({ id_plantilla: id(data.id_plantilla), estado: data.estado });
}
