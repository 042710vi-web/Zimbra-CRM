/** HU-15 y HU-16 - Actividad web.
 * Consulta y guarda los datos mediante las operaciones de la base de datos.
 */
import { sequelize } from '../config/database.js';
import { httpError } from '../utils/validators.js';
/** El procedimiento inserta el evento y sus triggers actualizan puntos y alertas. */
export async function createWebActivity({ id_cliente, id_accion, id_campana, direccion_origen, detalle, clave_rastreo, usuario }) {
  const [[row]] = await call('sp_registrar_actividad', [id_cliente, id_accion, id_campana, direccion_origen, detalle, clave_rastreo, usuario]);
  return { ...row, pendiente_identificacion: Boolean(Number(row.pendiente_identificacion)), es_retorno: Boolean(Number(row.es_retorno)), alerta_calificacion: Boolean(Number(row.alerta_calificacion)), alerta_retorno: Boolean(Number(row.alerta_retorno)) };
}
/** MySQL aplica un savepoint por evento y confirma el conjunto de válidos. */
export async function createWebActivitiesBatch({ actividades, usuario }) {
  const [[row]] = await call('sp_actividad_lote', [JSON.stringify(actividades), usuario]);
  const aceptadas = procedureJson(row.aceptadas).map(item => ({
    ...item,
    pendiente_identificacion: Boolean(Number(item.pendiente_identificacion)),
    es_retorno: Boolean(Number(item.es_retorno)),
    alerta_calificacion: Boolean(Number(item.alerta_calificacion)),
    alerta_retorno: Boolean(Number(item.alerta_retorno)),
  }));
  return { total: Number(row.total), aceptadas, rechazadas: procedureJson(row.rechazadas) };
}
/** Consulta el historial dentro del ámbito autorizado. */
export async function listClientActivities({ id_cliente, id_vendedor, page, limit, offset }) {
  return procedurePage(await call('sp_listar_actividad', [id_cliente, id_vendedor, limit, offset]), page, limit, row => ({ ...row, es_retorno: Boolean(Number(row.es_retorno)) }));
}


/** Pide a la base de datos que realice la operación de este módulo.
 * Devuelve los datos o informa el problema y deja disponible la conexión.
 * La base de datos se encarga de guardar o deshacer los cambios.
 */
async function call(name, parameters = []) {
  if (!['sp_actividad_lote', 'sp_listar_actividad', 'sp_registrar_actividad'].includes(name)) throw new Error('Procedimiento no permitido.');
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

/** Prepara los datos recibidos para que la aplicación pueda leerlos. */
const procedureJson = value => typeof value === 'string' ? JSON.parse(value) : value;
