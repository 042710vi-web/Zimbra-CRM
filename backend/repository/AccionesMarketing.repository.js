/**
 * Consulta y guarda en la base de datos la información de acciones marketing.
 */
import { Op, QueryTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import { AccionMarketing } from '../entity/AccionesMarketing.entity.js';
import { registerChanges } from './AuditoriaCambios.repository.js';

// Devuelve el catálogo y cuántas actividades se registraron con cada acción.
export async function listMarketingActions({ q, estado, page, limit, offset }) {
  const conditions = ['1 = 1'];
  const replacements = { limit, offset };
  if (q) { conditions.push('a.nombre_accion LIKE :q'); replacements.q = `%${q}%`; }
  if (estado !== undefined) { conditions.push('a.estado = :estado'); replacements.estado = estado; }
  const where = conditions.join(' AND ');
  const [count] = await sequelize.query(
    `SELECT COUNT(*) AS total FROM acciones_marketing a WHERE ${where}`,
    { replacements, type: QueryTypes.SELECT },
  );
  const rows = await sequelize.query(
    `SELECT a.id_accion, a.nombre_accion, a.puntaje, a.estado,
            COUNT(w.id_actividad) AS veces_registrada
       FROM acciones_marketing a
       LEFT JOIN actividad_web w ON w.id_accion = a.id_accion
      WHERE ${where}
      GROUP BY a.id_accion, a.nombre_accion, a.puntaje, a.estado
      ORDER BY a.nombre_accion
      LIMIT :limit OFFSET :offset`,
    { replacements, type: QueryTypes.SELECT },
  );
  return {
    data: rows,
    pagination: { page, limit, total: Number(count.total), pages: Math.ceil(Number(count.total) / limit) },
  };
}

// Registra una acción de marketing activa y registra su creación.
export async function createMarketingAction(data) {
  return sequelize.transaction(async (transaction) => {
    const duplicate = await AccionMarketing.findOne({ where: { nombre_accion: data.nombre_accion }, transaction });
    if (duplicate) throw Object.assign(new Error('Ya existe una acción con ese nombre.'), { status: 409 });
    const action = await AccionMarketing.create({ ...data, estado: true }, { transaction });
    await registerChanges({
      tabla: 'acciones_marketing', idRegistro: action.id_accion, usuario: 'zimbra-api', transaction,
      cambios: { puntaje: [null, action.puntaje] },
    });
    return action.id_accion;
  });
}

// Modifica nombre o puntaje sin cambiar los puntos ya guardados en actividades.
export async function updateMarketingAction({ id_accion, ...changes }, usuario) {
  return sequelize.transaction(async (transaction) => {
    const action = await AccionMarketing.findByPk(id_accion, { transaction, lock: transaction.LOCK.UPDATE });
    if (!action) throw Object.assign(new Error('La acción indicada no existe.'), { status: 404 });
    const before = action.get({ plain: true });
    const duplicate = await AccionMarketing.findOne({
      where: { nombre_accion: changes.nombre_accion, id_accion: { [Op.ne]: id_accion } }, transaction,
    });
    if (duplicate) throw Object.assign(new Error('Ya existe otra acción con ese nombre.'), { status: 409 });
    await action.update(changes, { transaction });
    await registerChanges({
      tabla: 'acciones_marketing', idRegistro: id_accion, usuario, transaction,
      cambios: Object.fromEntries(Object.keys(changes).map((field) => [field, [before[field], changes[field]]])),
    });
    return id_accion;
  });
}

// Activa o pausa una acción sin borrar las actividades que ya la utilizaron.
export async function changeMarketingActionStatus({ id_accion, estado }, usuario) {
  return sequelize.transaction(async (transaction) => {
    const action = await AccionMarketing.findByPk(id_accion, { transaction, lock: transaction.LOCK.UPDATE });
    if (!action) throw Object.assign(new Error('La acción indicada no existe.'), { status: 404 });
    const previous = Boolean(action.estado);
    await action.update({ estado }, { transaction });
    await registerChanges({
      tabla: 'acciones_marketing', idRegistro: id_accion, usuario, transaction,
      cambios: { estado: [previous ? 'Activa' : 'Inactiva', estado ? 'Activa' : 'Inactiva'] },
    });
  });
}