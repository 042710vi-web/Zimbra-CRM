/**
 * Consulta y guarda en la base de datos la información de campanas marketing.
 */
import { Op, QueryTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import { CampanasMarketing } from '../entity/CampanasMarketing.entity.js';
import { registerChanges } from './AuditoriaCambios.repository.js';

// Consulta campañas y calcula visitas, visitantes únicos y prospectos calificados.
export async function listarCampanasMarketing({ id_campana, estado, desde, hasta, page, limit, offset }) {
  const conditions = ['1 = 1'];
  const replacements = { limit: limit || 20, offset: offset || 0 };
  if (id_campana) { conditions.push('c.id_campana = :id_campana'); replacements.id_campana = id_campana; }
  if (estado) { conditions.push('c.estado = :estado'); replacements.estado = estado; }
  if (desde) { conditions.push('(c.fecha_fin IS NULL OR c.fecha_fin >= :desde)'); replacements.desde = desde; }
  if (hasta) { conditions.push('(c.fecha_inicio IS NULL OR c.fecha_inicio < DATE_ADD(:hasta, INTERVAL 1 DAY))'); replacements.hasta = hasta; }
  const where = conditions.join(' AND ');
  const [count] = await sequelize.query(
    `SELECT COUNT(*) AS total FROM campanas_marketing c WHERE ${where}`,
    { replacements, type: QueryTypes.SELECT },
  );
  const rows = await sequelize.query(
    `SELECT c.id_campana, c.nombre_campana, c.descripcion, c.presupuesto,
            c.fecha_inicio, c.fecha_fin, c.estado,
            COUNT(DISTINCT aw.id_actividad) AS visitas,
            COUNT(DISTINCT aw.id_cliente) AS visitantes,
            COUNT(DISTINCT CASE WHEN cl.estado_cliente = 'Calificado' THEN cl.id_cliente END) AS prospectos_calificados
       FROM campanas_marketing c
       LEFT JOIN actividad_web aw ON aw.id_campana = c.id_campana
         AND (:desde IS NULL OR aw.fecha_actividad >= :desde)
         AND (:hasta IS NULL OR aw.fecha_actividad < DATE_ADD(:hasta, INTERVAL 1 DAY))
       LEFT JOIN clientes cl ON cl.id_cliente = aw.id_cliente
      WHERE ${where}
      GROUP BY c.id_campana, c.nombre_campana, c.descripcion, c.presupuesto,
               c.fecha_inicio, c.fecha_fin, c.estado
      ORDER BY c.fecha_inicio DESC, c.nombre_campana
      LIMIT :limit OFFSET :offset`,
    { replacements: { ...replacements, desde: desde || null, hasta: hasta || null }, type: QueryTypes.SELECT },
  );
  return {
    data: rows.map((row) => ({ ...row, presupuesto: row.presupuesto === null ? null : Number(row.presupuesto) })),
    pagination: { page, limit, total: Number(count.total), pages: Math.ceil(Number(count.total) / limit) },
  };
}

// Registra una campaña junto con su primer movimiento de auditoría.
export async function crearCampanaMarketing(data) {
  return sequelize.transaction(async (transaction) => {
    const duplicate = await CampanasMarketing.findOne({ where: { nombre_campana: data.nombre_campana }, transaction });
    if (duplicate) throw Object.assign(new Error('Ya existe una campaña con ese nombre.'), { status: 409 });
    const campana = await CampanasMarketing.create(data, { transaction });
    await registerChanges({
      tabla: 'campanas_marketing', idRegistro: campana.id_campana, usuario: 'zimbra-api', transaction,
      cambios: { estado: [null, campana.estado] },
    });
    return campana.id_campana;
  });
}

// Actualiza los datos y conserva las actividades relacionadas.
export async function actualizarCampanaMarketing({ id_campana, ...changes }, usuario) {
  return sequelize.transaction(async (transaction) => {
    const campana = await CampanasMarketing.findByPk(id_campana, { transaction, lock: transaction.LOCK.UPDATE });
    if (!campana) throw Object.assign(new Error('La campaña indicada no existe.'), { status: 404 });
    const before = campana.get({ plain: true });
    const duplicate = await CampanasMarketing.findOne({ where: { nombre_campana: changes.nombre_campana, id_campana: { [Op.ne]: id_campana } }, transaction });
    if (duplicate) throw Object.assign(new Error('Ya existe otra campaña con ese nombre.'), { status: 409 });
    await campana.update(changes, { transaction });
    await registerChanges({
      tabla: 'campanas_marketing', idRegistro: id_campana, usuario, transaction,
      cambios: Object.fromEntries(Object.keys(changes).map((field) => [field, [before[field], changes[field]]])),
    });
    return id_campana;
  });
}

// Cambia el estado y registra los valores que se modificaron.
export async function cambiarEstadoCampanaMarketing({ id_campana, estado, fecha_fin }, usuario) {
  return sequelize.transaction(async (transaction) => {
    const campana = await CampanasMarketing.findByPk(id_campana, { transaction, lock: transaction.LOCK.UPDATE });
    if (!campana) throw Object.assign(new Error('La campaña indicada no existe.'), { status: 404 });
    const before = campana.get({ plain: true });
    const changes = { estado };
    if (fecha_fin) changes.fecha_fin = fecha_fin;
    await campana.update(changes, { transaction });
    await registerChanges({
      tabla: 'campanas_marketing', idRegistro: id_campana, usuario, transaction,
      cambios: Object.fromEntries(Object.keys(changes).map((field) => [field, [before[field], changes[field]]])),
    });
    return id_campana;
  });
}