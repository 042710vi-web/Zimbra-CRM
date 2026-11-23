import { sequelize } from '../config/database.js';

/** Conserva todos los conjuntos de filas del CALL, sin los paquetes de estado. */
export async function callProcedure(name, replacements = []) {
  if (!/^sp_[a-z0-9_]+$/i.test(name)) throw new Error('Nombre de procedimiento no permitido.');
  const connection = await sequelize.connectionManager.getConnection({ type: 'WRITE' });
  try {
    const results = await new Promise((resolve, reject) => {
      connection.query(
        `CALL ${name}(${replacements.map(() => '?').join(', ')})`,
        replacements.map((value) => value === undefined ? null : value),
        (error, rows) => error ? reject(error) : resolve(rows),
      );
    });
    return Array.isArray(results) ? results.filter(Array.isArray) : [];
  } finally {
    await sequelize.connectionManager.releaseConnection(connection);
  }
}
