import { QueryTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export async function listTemplates() {
  return sequelize.query('SELECT id_plantilla, evento, nombre_plantilla, asunto, cuerpo, estado, fecha_creacion, fecha_actualizacion FROM plantillas_correo ORDER BY evento, estado DESC, nombre_plantilla', { type: QueryTypes.SELECT });
}

export async function createTemplate(data) {
  return sequelize.transaction(async (transaction) => {
    if (data.estado) await sequelize.query('UPDATE plantillas_correo SET estado = FALSE WHERE evento = :evento AND estado = TRUE', { replacements: { evento: data.evento }, transaction });
    const [result] = await sequelize.query('INSERT INTO plantillas_correo (evento, nombre_plantilla, asunto, cuerpo, estado) VALUES (:evento, :nombre, :asunto, :cuerpo, :estado)', { replacements: { evento: data.evento, nombre: data.nombre_plantilla, asunto: data.asunto, cuerpo: data.cuerpo, estado: data.estado ?? false }, transaction });
    return { id_plantilla: result.insertId, message: 'Plantilla creada.' };
  });
}

export async function updateTemplate({ id_plantilla, asunto, cuerpo, nombre_plantilla }) {
  await sequelize.query('UPDATE plantillas_correo SET asunto = COALESCE(:asunto, asunto), cuerpo = COALESCE(:cuerpo, cuerpo), nombre_plantilla = COALESCE(:nombre, nombre_plantilla) WHERE id_plantilla = :id', { replacements: { id: id_plantilla, asunto: asunto ?? null, cuerpo: cuerpo ?? null, nombre: nombre_plantilla ?? null } });
  return { id_plantilla, message: 'Plantilla actualizada.' };
}

export async function setTemplateState({ id_plantilla, estado }) {
  return sequelize.transaction(async (transaction) => {
    const [template] = await sequelize.query('SELECT evento FROM plantillas_correo WHERE id_plantilla = :id FOR UPDATE', { replacements: { id: id_plantilla }, type: QueryTypes.SELECT, transaction });
    if (!template) throw Object.assign(new Error('No existe la plantilla indicada.'), { status: 404 });
    if (estado) await sequelize.query('UPDATE plantillas_correo SET estado = FALSE WHERE evento = :evento AND id_plantilla <> :id AND estado = TRUE', { replacements: { evento: template.evento, id: id_plantilla }, transaction });
    await sequelize.query('UPDATE plantillas_correo SET estado = :estado WHERE id_plantilla = :id', { replacements: { id: id_plantilla, estado }, transaction });
    return { id_plantilla, estado, message: 'Estado de plantilla actualizado.' };
  });
}
