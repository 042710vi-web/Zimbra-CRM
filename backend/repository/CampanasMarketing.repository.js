/** HU-12 y HU-13 - Campañas.
 * Consulta y guarda los datos mediante las operaciones de la base de datos.
 */
import { sequelize } from '../config/database.js';
import { httpError } from '../utils/validators.js';
/** Consulta campañas con métricas de actividad y prospectos calificados. */
export async function listarCampanasMarketing({ id_campana, estado, desde, hasta, page, limit = 20, offset = 0 }) {
  const sets = await call('sp_listar_campanas', [id_campana, estado, desde, hasta, limit, offset]);
  return procedurePage(sets, page, limit, row => ({ ...row, presupuesto: row.presupuesto === null ? null : Number(row.presupuesto) }));
}
/** Registra una campaña; MySQL valida fechas, presupuesto y unicidad. */
export async function crearCampanaMarketing(data, usuario) {
  const [[row]] = await call('sp_guardar_campana', [null, data.nombre_campana, data.codigo_campana, data.descripcion, data.presupuesto, data.fecha_inicio, data.fecha_fin, data.estado, usuario]);
  return row.id_campana;
}
/** Actualiza datos y conserva la actividad asociada. */
export async function actualizarCampanaMarketing(data, usuario) {
  await call('sp_guardar_campana', [data.id_campana, data.nombre_campana, data.codigo_campana, data.descripcion, data.presupuesto, data.fecha_inicio, data.fecha_fin, data.estado, usuario]);
}
/** MySQL comprueba la vigencia y confirma el cambio de estado. */
export async function cambiarEstadoCampanaMarketing({ id_campana, estado, fecha_fin }, usuario) {
  await call('sp_estado_campana', [id_campana, estado, fecha_fin, usuario]);
}

/** Pide a la base de datos que realice la operación de este módulo.
 * Devuelve los datos o informa el problema y deja disponible la conexión.
 * La base de datos se encarga de guardar o deshacer los cambios.
 */
async function call(name, parameters = []) {
  if (!['sp_estado_campana', 'sp_guardar_campana', 'sp_listar_campanas'].includes(name)) throw new Error('Procedimiento no permitido.');
  const connection = await sequelize.connectionManager.getConnection({ type: 'WRITE' });
  let codeLock = false;
  try {
    if (name === 'sp_guardar_campana' || name === 'sp_estado_campana') {
      const [lock] = await connectionQuery(connection, "SELECT GET_LOCK('zimbra:campanas:codigo', 10) AS acquired");
      if (Number(lock.acquired) !== 1) throw httpError(409, 'Otra campaña se está guardando. Intenta nuevamente.');
      codeLock = true;
      if (name === 'sp_guardar_campana' && parameters[0] != null) {
        const [current] = await new Promise((resolve, reject) => connection.query('SELECT estado FROM campanas_marketing WHERE id_campana = ?', [parameters[0]], (error, rows) => error ? reject(error) : resolve(rows)));
        if (!current) throw httpError(404, 'La campaña indicada no existe.');
        if (current.estado !== 'Activa') throw httpError(409, 'Reactiva la campaña antes de editarla.');
      }
      if (name === 'sp_guardar_campana' && parameters[0] == null && !String(parameters[2] ?? '').trim()) {
        const [row] = await connectionQuery(connection, "SELECT COALESCE(MAX(CAST(SUBSTRING(codigo_campana, 5) AS UNSIGNED)), 0) + 1 AS siguiente FROM campanas_marketing WHERE codigo_campana REGEXP '^CAM-[0-9]{6}$'");
        const next = Number(row.siguiente);
        if (!Number.isSafeInteger(next) || next < 1 || next > 999999) throw httpError(409, 'Se agotó el consecutivo de códigos de campaña.');
        parameters = [...parameters];
        parameters[2] = `CAM-${String(next).padStart(6, '0')}`;
      }
    }
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
    try {
      if (codeLock) await connectionQuery(connection, "DO RELEASE_LOCK('zimbra:campanas:codigo')");
    } finally {
      await sequelize.connectionManager.releaseConnection(connection);
    }
  }
}

function connectionQuery(connection, sql) {
  return new Promise((resolve, reject) => connection.query(sql, (error, rows) => error ? reject(error) : resolve(rows)));
}

/** Prepara la página solicitada y el total de resultados. */
function procedurePage(sets, page, limit, transform = row => row) {
  const total = Number(sets[1]?.[0]?.total || 0);
  return { data: (sets[0] || []).map(transform), pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
}
