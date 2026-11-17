/** HU-09 a HU-11 - Descargas de prueba.
 * Consulta y guarda los datos mediante las operaciones de la base de datos.
 */
import { sequelize } from '../config/database.js';
import { httpError } from '../utils/validators.js';
/** La descarga, actividad, puntaje y alertas se confirman en una sola llamada. */
export async function createTrial({ id_cliente, id_producto, usuario }) {
  const [[row]] = await call('sp_registrar_prueba', [id_cliente, id_producto, usuario]);
  return { ...row, alerta_calificacion: Boolean(Number(row.alerta_calificacion)) };
}
/** Consulta vencimientos, urgencia y venta asociada con paginación. */
export async function listTrials({ estado_prueba, id_cliente, id_producto, vence_desde, vence_hasta, id_vendedor, page, limit, offset }) {
  const sets = await call('sp_listar_pruebas', [estado_prueba, id_cliente, id_producto, vence_desde, vence_hasta, id_vendedor, limit, offset]);
  return procedurePage(sets, page, limit, row => ({ ...row, dias_restantes: Number(row.dias_restantes), urgente: Boolean(Number(row.urgente)), proxima_a_vencer: Boolean(Number(row.proxima_a_vencer)) }));
}
/** Devuelve el resumen confirmado y los avisos para enviar después del COMMIT. */
export async function expireTrials(usuario = 'sistema') {
  const [summary, avisos] = await call('sp_vencer_pruebas', [usuario]);
  return { ...summary[0], avisos };
}

/** Pide a la base de datos que realice la operación de este módulo.
 * Devuelve los datos o informa el problema y deja disponible la conexión.
 * La base de datos se encarga de guardar o deshacer los cambios.
 */
async function call(name, parameters = []) {
  if (!['sp_listar_pruebas', 'sp_registrar_prueba', 'sp_vencer_pruebas'].includes(name)) throw new Error('Procedimiento no permitido.');
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

/** Prepara la página solicitada y el total de resultados. */
function procedurePage(sets, page, limit, transform = row => row) {
  const total = Number(sets[1]?.[0]?.total || 0);
  return { data: (sets[0] || []).map(transform), pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
}
