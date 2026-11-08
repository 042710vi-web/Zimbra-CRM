import { sequelize } from '../config/database.js';
import { Asignacion } from '../entity/asignacion.entity.js';
import { Cliente } from '../entity/cliente.entity.js';
import { Vendedor } from '../entity/vendedor.entity.js';
import { QueryTypes } from 'sequelize';

export async function listAssignments({ id_vendedor, estado, page, limit }) {
  const clauses = ['1=1']; const replacements = { limit, offset: (page - 1) * limit };
  if (id_vendedor) { clauses.push('a.id_vendedor = :id_vendedor'); replacements.id_vendedor = id_vendedor; }
  if (estado) { clauses.push('a.estado = :estado'); replacements.estado = estado; }
  const where = clauses.join(' AND ');
  const [count] = await sequelize.query(`SELECT COUNT(*) total FROM asignaciones_crm a WHERE ${where}`, { replacements, type: QueryTypes.SELECT });
  const rows = await sequelize.query(`SELECT a.*, c.nombre_completo, v.nombre_vendedor FROM asignaciones_crm a JOIN clientes c ON c.id_cliente=a.id_cliente JOIN vendedores v ON v.id_vendedor=a.id_vendedor WHERE ${where} ORDER BY a.fecha_asignacion DESC LIMIT :limit OFFSET :offset`, { replacements, type: QueryTypes.SELECT });
  return { rows, count: Number(count.total) };
}

export async function createAssignment({ id_cliente, id_vendedor }) {
  return sequelize.transaction(async (transaction) => {
    const lock = { transaction, lock: transaction.LOCK.UPDATE };
    const vendor = await Vendedor.findOne({ where: { id_vendedor, estado: true }, ...lock });
    if (!vendor) throw Object.assign(new Error('El vendedor no existe o está inactivo.'), { status: 404 });
    const client = await Cliente.findByPk(id_cliente, lock);
    if (!client) throw Object.assign(new Error('El cliente indicado no existe.'), { status: 404 });
    if (client.estado_cliente === 'Inactivo') throw Object.assign(new Error('No se puede asignar un cliente inactivo.'), { status: 400 });
    const active = await Asignacion.findOne({ where: { id_cliente, estado: 'Activa' }, transaction, lock: transaction.LOCK.UPDATE });
    if (active) throw Object.assign(new Error('El cliente ya tiene una asignación activa; utiliza reasignar.'), { status: 409 });
    const assignment = await Asignacion.create({ id_cliente, id_vendedor, estado: 'Activa' }, { transaction });
    return { id_asignacion: assignment.id_asignacion, message: 'Cliente asignado correctamente.' };
  });
}

export async function reassignClient({ id_cliente, id_vendedor }) {
  return sequelize.transaction(async (transaction) => {
    const assignment = await Asignacion.findOne({ where: { id_cliente, estado: 'Activa' }, transaction, lock: transaction.LOCK.UPDATE });
    if (!assignment) throw Object.assign(new Error('El cliente no tiene asignación activa.'), { status: 404 });
    const vendor = await Vendedor.findOne({ where: { id_vendedor, estado: true }, transaction, lock: transaction.LOCK.UPDATE });
    if (!vendor) throw Object.assign(new Error('El vendedor no existe o está inactivo.'), { status: 404 });
    if (assignment.id_vendedor === id_vendedor) throw Object.assign(new Error('El cliente ya está asignado a ese vendedor.'), { status: 409 });
    await assignment.update({ estado: 'Finalizada', fecha_fin: new Date() }, { transaction });
    const next = await Asignacion.create({ id_cliente, id_vendedor, estado: 'Activa' }, { transaction });
    return { id_asignacion: next.id_asignacion, message: 'Cliente reasignado correctamente.' };
  });
}

export async function finishAssignment({ id_asignacion }) {
  const assignment = await Asignacion.findOne({ where: { id_asignacion, estado: 'Activa' } });
  if (!assignment) throw Object.assign(new Error('No existe una asignación activa con ese ID.'), { status: 404 });
  await assignment.update({ estado: 'Finalizada', fecha_fin: new Date() });
  return { id_asignacion, message: 'Asignación finalizada correctamente.' };
}
