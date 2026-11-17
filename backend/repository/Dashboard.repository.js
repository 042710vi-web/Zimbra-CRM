/** HU-31 - Panel comercial.
 * Consulta y guarda los datos mediante las operaciones de la base de datos.
 */
import { sequelize } from '../config/database.js';
import { httpError } from '../utils/validators.js';
/** Consulta juntos los prospectos, pruebas, ventas, asignaciones y alertas del panel. */
export async function getDashboard({ id_vendedor }) {
  const [qualified, trials, sales, assignments, alerts] = await call('sp_dashboard', [id_vendedor]);
  return {
    prospectos_calificados: qualified,
    pruebas_por_vencer: trials.map(row => ({ ...row, dias_restantes: Number(row.dias_restantes) })),
    ventas_pendientes: { cantidad: Number(sales[0].cantidad), total_proyectado: Number(sales[0].total_proyectado) },
    asignaciones_activas: Number(assignments[0].clientes_asignados),
    alertas_pendientes: alerts,
  };
}

/** Pide a la base de datos que realice la operación de este módulo.
 * Devuelve los datos o informa el problema y deja disponible la conexión.
 * La base de datos se encarga de guardar o deshacer los cambios.
 */
async function call(name, parameters = []) {
  if (!['sp_dashboard'].includes(name)) throw new Error('Procedimiento no permitido.');
  const connection = await sequelize.connectionManager.getConnection({ type: 'WRITE' });
  try {
    const results = await new Promise((resolve, reject) => {
      connection.query(
        `CALL ${name}(${parameters.map(() => '?').join(',')})`,
        parameters.map(value => value === undefined ? null : value),
        (error, rows) => error ? reject(error) : resolve(rows),
      );
    });
    // Conserva las listas de datos que devuelve la consulta.
    return results.filter(Array.isArray);
  } catch (error) {
    const status = { 30001: 400, 30003: 403, 30004: 404, 30009: 409, 1062: 409, 1452: 400, 3819: 400, 1406: 400 }[error.errno];
    if (status) {
      const message = error.errno === 1062 ? 'El nombre o dato único ya está registrado.'
        : error.errno === 1452 ? 'La referencia indicada no existe.'
          : error.errno === 3819 ? 'Alguno de los valores enviados no está permitido.'
            : error.errno === 1406 ? 'Alguno de los textos enviados es demasiado largo.'
              : error.sqlMessage;
      throw httpError(status, message);
    }
    throw error;
  } finally {
    await sequelize.connectionManager.releaseConnection(connection);
  }
}
