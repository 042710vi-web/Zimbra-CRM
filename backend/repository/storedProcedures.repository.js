import { sequelize } from '../config/database.js';
import { QueryTypes } from 'sequelize';

/** Ejecuta un procedimiento almacenado del esquema Zimbra. */
export async function callProcedure(name, replacements = []) {
  if (!/^sp_[a-z0-9_]+$/i.test(name)) throw new Error('Nombre de procedimiento no permitido.');
  const placeholders = replacements.map(() => '?').join(', ');
  const [result] = await sequelize.query(`CALL ${name}(${placeholders})`, {
    replacements,
    type: QueryTypes.RAW,
  });
  return result;
}

