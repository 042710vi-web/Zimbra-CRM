/**
 * Consulta y guarda en la base de datos la información de actividad web.
 */
import { QueryTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import { AccionMarketing } from '../entity/AccionesMarketing.entity.js';
import { ActividadWeb } from '../entity/ActividadWeb.entity.js';
import { Asignacion } from '../entity/AsignacionesCrm.entity.js';
import { CampanasMarketing } from '../entity/CampanasMarketing.entity.js';
import { Cliente } from '../entity/Clientes.entity.js';
import { registerChanges } from './AuditoriaCambios.repository.js';

/** Apoya la gestión de actividadweb mediante una tarea interna del sistema. */
function leadState(score) {
  if (score >= 70) return 'Calificado';
  if (score >= 30) return 'Tibio';
  return 'Frio';
}

// Guarda la actividad, actualiza puntaje y clasificación.
export async function recordActivityInTransaction({ client, action, id_campana, direccion_origen, detalle, usuario, transaction }) {
  const activity = await ActividadWeb.create({
    id_cliente: client.id_cliente,
    id_accion: action.id_accion,
    id_campana: id_campana || null,
    puntaje_otorgado: action.puntaje,
    direccion_origen: direccion_origen || null,
    detalle: detalle || null,
  }, { transaction });

  const previousScore = Number(client.puntaje_total || 0);
  const nextScore = previousScore + Number(action.puntaje);
  const previousState = client.estado_cliente;
  const nextState = ['Cliente', 'Inactivo'].includes(previousState) ? previousState : leadState(nextScore);
  await client.update({ puntaje_total: nextScore, estado_cliente: nextState }, { transaction });

  await registerChanges({
    tabla: 'clientes', idRegistro: client.id_cliente, usuario, transaction,
    cambios: {
      puntaje_total: [previousScore, nextScore],
      estado_cliente: [previousState, nextState],
    },
  });

  const assignment = previousState !== 'Calificado' && nextState === 'Calificado'
    ? await Asignacion.findOne({ where: { id_cliente: client.id_cliente, estado: 'Activa' }, transaction })
    : null;
  return {
    id_actividad: activity.id_actividad,
    puntos_agregados: Number(action.puntaje),
    puntaje_total: nextScore,
    estado_cliente: nextState,
    alerta_calificacion: Boolean(assignment),
  };
}

/** Realiza la consulta o el cambio de información solicitado. */
export async function createWebActivity({ id_cliente, id_accion, id_campana, direccion_origen, detalle, usuario }) {
  return sequelize.transaction(async (transaction) => {
    const client = await Cliente.findByPk(id_cliente, { transaction, lock: transaction.LOCK.UPDATE });
    if (!client) throw Object.assign(new Error('El cliente indicado no existe.'), { status: 404 });
    if (client.estado_cliente === 'Inactivo') throw Object.assign(new Error('No se puede registrar actividad para un cliente inactivo.'), { status: 409 });
    const action = await AccionMarketing.findOne({ where: { id_accion, estado: true }, transaction, lock: transaction.LOCK.UPDATE });
    if (!action) throw Object.assign(new Error('La acción no existe o está inactiva.'), { status: 400 });
    if (id_campana) {
      const campana = await CampanasMarketing.findOne({ where: { id_campana, estado: 'Activa' }, transaction, lock: transaction.LOCK.UPDATE });
      if (!campana) throw Object.assign(new Error('La campaña no existe o está inactiva.'), { status: 400 });
      const today = new Date().toISOString().slice(0, 10);
      if ((campana.fecha_inicio && campana.fecha_inicio > today) || (campana.fecha_fin && campana.fecha_fin < today)) {
        throw Object.assign(new Error('La campaña no está dentro de su periodo de vigencia.'), { status: 400 });
      }
    }
    return recordActivityInTransaction({ client, action, id_campana, direccion_origen, detalle, usuario, transaction });
  });
}

// Presenta el historial de un cliente en orden cronológico inverso.
export async function listClientActivities({ id_cliente, id_vendedor, page, limit, offset }) {
  const ownerFilter = id_vendedor
    ? `AND EXISTS (SELECT 1 FROM asignaciones_crm a WHERE a.id_cliente = w.id_cliente AND a.id_vendedor = :id_vendedor AND a.estado = 'Activa')`
    : '';
  const replacements = { id_cliente, id_vendedor: id_vendedor || null, limit, offset };
  const [count] = await sequelize.query(
    `SELECT COUNT(*) AS total FROM actividad_web w
      WHERE w.id_cliente = :id_cliente ${ownerFilter}`,
    { replacements, type: QueryTypes.SELECT },
  );
  const rows = await sequelize.query(
    `SELECT w.id_actividad, w.id_cliente, w.id_accion, a.nombre_accion,
            w.puntaje_otorgado, w.id_campana, c.nombre_campana,
            w.fecha_actividad, w.direccion_origen, w.detalle
       FROM actividad_web w
       INNER JOIN acciones_marketing a ON a.id_accion = w.id_accion
       LEFT JOIN campanas_marketing c ON c.id_campana = w.id_campana
      WHERE w.id_cliente = :id_cliente ${ownerFilter}
      ORDER BY w.fecha_actividad DESC, w.id_actividad DESC
      LIMIT :limit OFFSET :offset`,
    { replacements, type: QueryTypes.SELECT },
  );
  return {
    data: rows,
    pagination: { page, limit, total: Number(count.total), pages: Math.ceil(Number(count.total) / limit) },
  };
}

// Recalcula los puntajes desde el registro histórico de actividades.
export async function recalculateLeadScores(usuario) {
  return sequelize.transaction(async (transaction) => {
    const clients = await Cliente.findAll({ transaction, lock: transaction.LOCK.UPDATE });
    const scores = await sequelize.query(
      `SELECT id_cliente, COALESCE(SUM(puntaje_otorgado), 0) AS puntaje
         FROM actividad_web GROUP BY id_cliente`,
      { type: QueryTypes.SELECT, transaction },
    );
    const scoreByClient = new Map(scores.map((row) => [Number(row.id_cliente), Number(row.puntaje)]));
    const qualified = [];
    let changed = 0;
    for (const client of clients) {
      const previousScore = Number(client.puntaje_total || 0);
      const nextScore = scoreByClient.get(client.id_cliente) || 0;
      const previousState = client.estado_cliente;
      const nextState = ['Cliente', 'Inactivo'].includes(previousState) ? previousState : leadState(nextScore);
      if (previousScore === nextScore && previousState === nextState) continue;
      await client.update({ puntaje_total: nextScore, estado_cliente: nextState }, { transaction });
      await registerChanges({
        tabla: 'clientes', idRegistro: client.id_cliente, usuario, transaction,
        cambios: { puntaje_total: [previousScore, nextScore], estado_cliente: [previousState, nextState] },
      });
      changed += 1;
      if (previousState !== 'Calificado' && nextState === 'Calificado') qualified.push(client.id_cliente);
    }
    let assignedQualified = [];
    if (qualified.length) {
      const assignments = await sequelize.query(
        `SELECT DISTINCT id_cliente FROM asignaciones_crm
          WHERE estado = 'Activa' AND id_cliente IN (:ids)`,
        { replacements: { ids: qualified }, type: QueryTypes.SELECT, transaction },
      );
      assignedQualified = assignments.map((row) => Number(row.id_cliente));
    }
    return { clientes_revisados: clients.length, clientes_actualizados: changed, prospectos_calificados: assignedQualified };
  });
}