/**
 * Consulta y guarda en la base de datos la información de asignaciones crm.
 */
import { sequelize } from '../config/database.js';
import { Asignacion } from '../entity/AsignacionesCrm.entity.js';
import { Cliente } from '../entity/Clientes.entity.js';
import { Vendedor } from '../entity/Vendedores.entity.js';
import { QueryTypes } from 'sequelize';
import { registerChanges } from './AuditoriaCambios.repository.js';
import { callProcedure } from './storedProcedures.repository.js';

/** Realiza la consulta o el cambio de información solicitado. */
export async function listAssignments({ id_vendedor, estado, page, limit }) {
  const clauses = ['1=1']; const replacements = { limit, offset: (page - 1) * limit };
  if (id_vendedor) { clauses.push('a.id_vendedor = :id_vendedor'); replacements.id_vendedor = id_vendedor; }
  if (estado) { clauses.push('a.estado = :estado'); replacements.estado = estado; }
  const where = clauses.join(' AND ');
  const [count] = await sequelize.query(`SELECT COUNT(*) total FROM asignaciones_crm a WHERE ${where}`, { replacements, type: QueryTypes.SELECT });
  const rows = await sequelize.query(`SELECT a.*, c.nombre_completo, v.nombre_vendedor FROM asignaciones_crm a JOIN clientes c ON c.id_cliente=a.id_cliente JOIN vendedores v ON v.id_vendedor=a.id_vendedor WHERE ${where} ORDER BY a.fecha_asignacion DESC LIMIT :limit OFFSET :offset`, { replacements, type: QueryTypes.SELECT });
  const carga = await sequelize.query(`SELECT * FROM vw_reporte_asignaciones ${id_vendedor ? 'WHERE id_vendedor = :id_vendedor' : ''} ORDER BY nombre_vendedor`, { replacements: id_vendedor ? { id_vendedor } : {}, type: QueryTypes.SELECT });
  return { rows, count: Number(count.total), carga };
}

// El sistema crea una sola asignación activa por cliente y registra el movimiento en la misma transacción.
export async function createAssignment({ id_cliente, id_vendedor, usuario }) {
  return sequelize.transaction(async (transaction) => {
    const lock = { transaction, lock: transaction.LOCK.UPDATE };
    const client = await Cliente.findByPk(id_cliente, lock);
    if (!client) throw Object.assign(new Error('El cliente indicado no existe.'), { status: 404 });
    if (client.estado_cliente === 'Inactivo') throw Object.assign(new Error('No se puede asignar un cliente inactivo.'), { status: 400 });
    const vendor = await Vendedor.findOne({ where: { id_vendedor, estado: true }, ...lock });
    if (!vendor) throw Object.assign(new Error('El vendedor no existe o está inactivo.'), { status: 404 });
    const active = await Asignacion.findOne({ where: { id_cliente, estado: 'Activa' }, transaction, lock: transaction.LOCK.UPDATE });
    if (active) throw Object.assign(new Error('El cliente ya tiene una asignación activa; utiliza reasignar.'), { status: 409 });
    const assignment = await Asignacion.create({ id_cliente, id_vendedor, estado: 'Activa' }, { transaction });
    await registerChanges({
      tabla: 'asignaciones_crm', idRegistro: assignment.id_asignacion, usuario, transaction,
      cambios: {
        id_cliente: [null, id_cliente], id_vendedor: [null, id_vendedor],
        estado: [null, 'Activa'], fecha_asignacion: [null, assignment.fecha_asignacion],
        fecha_fin: [null, assignment.fecha_fin],
      },
    });
    return { id_asignacion: assignment.id_asignacion, message: 'Cliente asignado correctamente.' };
  });
}

export async function createAssignmentsBatch({ id_clientes, id_vendedor, usuario }) {
  return sequelize.transaction(async (transaction) => {
    const vendor = await Vendedor.findOne({ where: { id_vendedor, estado: true }, transaction, lock: transaction.LOCK.UPDATE });
    if (!vendor) throw Object.assign(new Error('El vendedor no existe o está inactivo.'), { status: 404 });
    const clients = await Cliente.findAll({ where: { id_cliente: id_clientes }, transaction, lock: transaction.LOCK.UPDATE });
    if (clients.length !== id_clientes.length) throw Object.assign(new Error('Uno o más clientes no existen.'), { status: 404 });
    if (clients.some((client) => client.estado_cliente !== 'Calificado')) throw Object.assign(new Error('La asignación por lote solo acepta prospectos calificados.'), { status: 409 });
    const active = await Asignacion.findAll({ where: { id_cliente: id_clientes, estado: 'Activa' }, transaction, lock: transaction.LOCK.UPDATE });
    if (active.length) throw Object.assign(new Error('Uno o más clientes ya tienen una asignación activa.'), { status: 409 });
    const rows = [];
    for (const id_cliente of id_clientes) {
      const row = await Asignacion.create({ id_cliente, id_vendedor, estado: 'Activa' }, { transaction });
      rows.push(row);
      await registerChanges({ tabla: 'asignaciones_crm', idRegistro: row.id_asignacion, usuario, transaction, cambios: { id_cliente: [null, id_cliente], id_vendedor: [null, id_vendedor], estado: [null, 'Activa'] } });
    }
    return { asignaciones: rows.map((row) => row.id_asignacion), message: `${rows.length} clientes asignados en una transacción.` };
  });
}

export async function takeQualifiedProspect({ id_cliente, id_vendedor, usuario }) {
  return sequelize.transaction(async (transaction) => {
    const client = await Cliente.findOne({ where: { id_cliente, estado_cliente: 'Calificado' }, transaction, lock: transaction.LOCK.UPDATE });
    if (!client) throw Object.assign(new Error('El prospecto no existe o no está calificado.'), { status: 404 });
    const existing = await Asignacion.findOne({ where: { id_cliente, estado: 'Activa' }, transaction, lock: transaction.LOCK.UPDATE });
    if (existing) throw Object.assign(new Error('El prospecto ya tiene un responsable.'), { status: 409 });
    const vendor = await Vendedor.findOne({ where: { id_vendedor, estado: true }, transaction, lock: transaction.LOCK.UPDATE });
    if (!vendor) throw Object.assign(new Error('El vendedor no existe o está inactivo.'), { status: 403 });
    const row = await Asignacion.create({ id_cliente, id_vendedor, estado: 'Activa' }, { transaction });
    await registerChanges({ tabla: 'asignaciones_crm', idRegistro: row.id_asignacion, usuario, transaction, cambios: { id_cliente: [null, id_cliente], id_vendedor: [null, id_vendedor], estado: [null, 'Activa'] } });
    return { id_asignacion: row.id_asignacion, message: 'Prospecto asignado a tu usuario.' };
  });
}

// El sistema finaliza la asignación anterior antes de registrar la nueva.
async function reassignClientLegacy({ id_cliente, id_vendedor, usuario }) {
  return sequelize.transaction(async (transaction) => {
    const client = await Cliente.findByPk(id_cliente, { transaction, lock: transaction.LOCK.UPDATE });
    if (!client) throw Object.assign(new Error('El cliente indicado no existe.'), { status: 404 });
    if (client.estado_cliente === 'Inactivo') throw Object.assign(new Error('No se puede reasignar un cliente inactivo.'), { status: 409 });
    const assignment = await Asignacion.findOne({ where: { id_cliente, estado: 'Activa' }, transaction, lock: transaction.LOCK.UPDATE });
    if (!assignment) throw Object.assign(new Error('El cliente no tiene asignación activa.'), { status: 404 });
    const vendor = await Vendedor.findOne({ where: { id_vendedor, estado: true }, transaction, lock: transaction.LOCK.UPDATE });
    if (!vendor) throw Object.assign(new Error('El vendedor no existe o está inactivo.'), { status: 404 });
    if (assignment.id_vendedor === id_vendedor) throw Object.assign(new Error('El cliente ya está asignado a ese vendedor.'), { status: 409 });
    const previousEndDate = assignment.fecha_fin;
    const fecha_fin = new Date();
    await assignment.update({ estado: 'Finalizada', fecha_fin }, { transaction });
    await registerChanges({
      tabla: 'asignaciones_crm', idRegistro: assignment.id_asignacion, usuario, transaction,
      cambios: { estado: ['Activa', 'Finalizada'], fecha_fin: [previousEndDate, fecha_fin] },
    });
    const next = await Asignacion.create({ id_cliente, id_vendedor, estado: 'Activa' }, { transaction });
    await registerChanges({
      tabla: 'asignaciones_crm', idRegistro: next.id_asignacion, usuario, transaction,
      cambios: {
        id_cliente: [null, id_cliente], id_vendedor: [null, id_vendedor],
        estado: [null, 'Activa'], fecha_asignacion: [null, next.fecha_asignacion],
        fecha_fin: [null, next.fecha_fin],
      },
    });
    return { id_asignacion: next.id_asignacion, message: 'Cliente reasignado correctamente.' };
  });
}

// El sistema cierra una asignación activa, conserva su fecha final y registra el cambio.
async function finishAssignmentLegacy({ id_asignacion, usuario }) {
  return sequelize.transaction(async (transaction) => {
    const assignment = await Asignacion.findOne({
      where: { id_asignacion, estado: 'Activa' }, transaction, lock: transaction.LOCK.UPDATE,
    });
    if (!assignment) throw Object.assign(new Error('No existe una asignación activa con ese ID.'), { status: 404 });
    const previousDate = assignment.fecha_fin;
    const fecha_fin = new Date();
    await assignment.update({ estado: 'Finalizada', fecha_fin }, { transaction });
    await registerChanges({
      tabla: 'asignaciones_crm', idRegistro: id_asignacion, usuario, transaction,
      cambios: { estado: ['Activa', 'Finalizada'], fecha_fin: [previousDate, fecha_fin] },
    });
    return { id_asignacion, message: 'Asignación finalizada correctamente.' };
  });
}

export async function reassignClient({ id_cliente, id_vendedor }) {
  const vendor = await Vendedor.findOne({ where: { id_vendedor, estado: true } });
  if (!vendor) throw Object.assign(new Error('El vendedor no existe o está inactivo.'), { status: 404 });
  await callProcedure('sp_reasignar_cliente', [id_cliente, id_vendedor, 'Reasignación solicitada desde CRM']);
  return { id_cliente, id_vendedor, message: 'Cliente reasignado correctamente.' };
}

export async function finishAssignment({ id_asignacion }) {
  await callProcedure('sp_finalizar_asignacion', [id_asignacion]);
  return { id_asignacion, message: 'Asignación finalizada correctamente.' };
}
