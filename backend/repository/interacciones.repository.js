/**
 * Consulta y guarda en la base de datos la información de interacciones.
 */
import { Op } from 'sequelize';
import { sequelize } from '../config/database.js';
import { Asignacion } from '../entity/AsignacionesCrm.entity.js';
import { Interaccion } from '../entity/Interacciones.entity.js';
import { callProcedure } from './storedProcedures.repository.js';
import { QueryTypes } from 'sequelize';

/** Realiza la consulta o el cambio de información solicitado. */
export async function listInteractions({ id_vendedor, id_asignacion, tipo_interaccion, page, limit }) {
  const where = {};
  if (id_asignacion) where.id_asignacion = id_asignacion;
  if (tipo_interaccion) where.tipo_interaccion = tipo_interaccion;
  const assignmentWhere = id_vendedor ? { id_vendedor } : undefined;
  return Interaccion.findAndCountAll({
    where, include: [{ model: Asignacion, as: 'asignacion', required: Boolean(assignmentWhere), where: assignmentWhere }],
    order: [['fecha_interaccion', 'DESC']], limit, offset: (page - 1) * limit, distinct: true,
  });
}

/** Realiza la consulta o el cambio de información solicitado. */
export async function createInteraction({ id_asignacion, tipo_interaccion, resultado, notas, id_vendedor }) {
  const assignment = await Asignacion.findOne({ where: { id_asignacion, estado: 'Activa' } });
  if (!assignment) throw Object.assign(new Error('La asignación no existe o ya finalizó.'), { status: 404 });
  if (id_vendedor && assignment.id_vendedor !== id_vendedor) throw Object.assign(new Error('La asignación no pertenece al vendedor autenticado.'), { status: 403 });
  await callProcedure('sp_registrar_interaccion', [assignment.id_cliente, tipo_interaccion, resultado || null, notas || null]);
  return { id_cliente: assignment.id_cliente, message: 'Interacción registrada correctamente.' };
}

export async function getClientTimeline({ id_cliente, id_vendedor }) {
  const replacements = { id_cliente };
  let ownership = '';
  if (id_vendedor) { ownership = 'AND EXISTS (SELECT 1 FROM asignaciones_crm own WHERE own.id_cliente = :id_cliente AND own.id_vendedor = :id_vendedor)'; replacements.id_vendedor = id_vendedor; }
  return sequelize.query(`SELECT tipo_evento, fecha_evento, descripcion FROM (
      SELECT h.tipo_evento, h.fecha_evento, h.descripcion FROM vw_historial_cliente h WHERE h.id_cliente = :id_cliente
      UNION ALL SELECT 'Descarga de prueba', d.fecha_inicio, CONCAT(p.nombre_producto, ' - ', d.estado_prueba) FROM descargas_prueba d JOIN productos p ON p.id_producto = d.id_producto WHERE d.id_cliente = :id_cliente
      UNION ALL SELECT 'Actividad web', aw.fecha_actividad, COALESCE(aw.detalle, CONCAT('Acción ', aw.id_accion)) FROM actividad_web aw WHERE aw.id_cliente = :id_cliente
    ) timeline WHERE 1=1 ${ownership} ORDER BY fecha_evento DESC`, { replacements, type: QueryTypes.SELECT });
}

export async function updateInteraction({ id_interaccion, id_vendedor, tipo_interaccion, notas }) {
  const replacements = { id_interaccion, tipo_interaccion: tipo_interaccion ?? null, notas: notas ?? null };
  const owner = id_vendedor ? 'AND a.id_vendedor = :id_vendedor' : '';
  if (id_vendedor) replacements.id_vendedor = id_vendedor;
  const [row] = await sequelize.query(`SELECT i.id_interaccion FROM interacciones i JOIN asignaciones_crm a ON a.id_asignacion = i.id_asignacion WHERE i.id_interaccion = :id_interaccion ${owner}`, { replacements, type: QueryTypes.SELECT });
  if (!row) throw Object.assign(new Error('La interacción no existe o no pertenece al vendedor autenticado.'), { status: 404 });
  const sets = [];
  if (tipo_interaccion !== undefined) sets.push('tipo_interaccion = :tipo_interaccion');
  if (notas !== undefined) sets.push('notas = :notas');
  await sequelize.query(`UPDATE interacciones SET ${sets.join(', ')} WHERE id_interaccion = :id_interaccion`, { replacements });
  return { id_interaccion, message: 'Interacción actualizada.' };
}
