import { Op } from 'sequelize';
import { sequelize } from '../config/database.js';
import { Asignacion } from '../entity/asignacion.entity.js';
import { Interaccion } from '../entity/interaccion.entity.js';

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

export async function createInteraction({ id_asignacion, tipo_interaccion, resultado, notas, id_vendedor }) {
  return sequelize.transaction(async (transaction) => {
    const assignment = await Asignacion.findOne({ where: { id_asignacion, estado: 'Activa' }, transaction, lock: transaction.LOCK.UPDATE });
    if (!assignment) throw Object.assign(new Error('La asignación no existe o ya finalizó.'), { status: 404 });
    if (id_vendedor && assignment.id_vendedor !== id_vendedor) throw Object.assign(new Error('La asignación no pertenece al vendedor autenticado.'), { status: 403 });
    return Interaccion.create({ id_asignacion, tipo_interaccion, resultado: resultado || null, notas: notas || null }, { transaction });
  });
}
