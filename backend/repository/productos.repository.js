/** HU-07 y HU-08 - Productos y licencias.
 * Consulta y guarda los datos mediante las operaciones de la base de datos.
 */
import { sequelize } from '../config/database.js';
import { httpError } from '../utils/validators.js';

/** Consulta productos y transforma importes para la respuesta HTTP. */
export async function listProducts({ tipo_licencia, estado, q, page, limit, offset }) {
  const sets = await call('sp_listar_productos', [tipo_licencia, estado, q || null, limit, offset]);
  return procedurePage(sets, page, limit, row => ({ ...row, precio: Number(row.precio) }));
}
/** MySQL guarda el producto, valida su licencia y registra su auditoría. */
export async function createProduct(data, usuario) {
  const [[row]] = await call('sp_guardar_producto', [null, data.nombre_producto, data.tipo_licencia, data.precio, usuario]);
  return row.id_producto;
}
/** Actualiza el catálogo conservando los precios de ventas existentes. */
export async function updateProduct(data, usuario) {
  const [[row]] = await call('sp_guardar_producto', [data.id_producto, data.nombre_producto, data.tipo_licencia, data.precio, usuario]);
  return row.id_producto;
}
/** Cambia la disponibilidad sin eliminar el producto. */
export async function changeProductStatus({ id_producto, estado }, usuario) {
  await call('sp_estado_producto', [id_producto, estado, usuario]);
}

/** Pide a la base de datos que realice la operación de este módulo.
 * Devuelve los datos o informa el problema y deja disponible la conexión.
 * La base de datos se encarga de guardar o deshacer los cambios.
 */
async function call(name, parameters = []) {
  if (!['sp_estado_producto', 'sp_guardar_producto', 'sp_listar_productos'].includes(name)) throw new Error('Procedimiento no permitido.');
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
