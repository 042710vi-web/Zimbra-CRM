import { QueryTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import { SalesforceSync } from '../entity/salesforce-sync.entity.js';

export async function findClientForSalesforce(id_cliente) {
  const rows = await sequelize.query(
    `SELECT
       c.id_cliente,
       c.nombre_completo,
       c.correo_electronico,
       c.telefono,
       c.estado_cliente,
       e.nombre_empresa
     FROM clientes c
     LEFT JOIN empresas e ON e.id_empresa = c.id_empresa
     WHERE c.id_cliente = :id_cliente
     LIMIT 1`,
    {
      replacements: { id_cliente },
      type: QueryTypes.SELECT,
    },
  );

  return rows[0] || null;
}

export async function createSyncAttempt({ id_cliente, objeto_salesforce }) {
  return SalesforceSync.create({
    id_cliente,
    objeto_salesforce,
    estado: 'Pendiente',
    intentos: 0,
    fecha_creacion: new Date(),
    fecha_actualizacion: new Date(),
  });
}

export async function markSyncSuccess({
  id_sincronizacion,
  salesforce_id,
}) {
  return SalesforceSync.update(
    {
      estado: 'Sincronizado',
      salesforce_id,
      mensaje_error: null,
      intentos: sequelize.literal('intentos + 1'),
      fecha_actualizacion: new Date(),
    },
    { where: { id_sincronizacion } },
  );
}

export async function markSyncFailure({
  id_sincronizacion,
  mensaje_error,
}) {
  return SalesforceSync.update(
    {
      estado: 'Fallido',
      mensaje_error: String(mensaje_error || 'Error de sincronización').slice(0, 4000),
      intentos: sequelize.literal('intentos + 1'),
      fecha_actualizacion: new Date(),
    },
    { where: { id_sincronizacion } },
  );
}

export async function findSyncAttempt(id_sincronizacion) {
  return SalesforceSync.findByPk(id_sincronizacion);
}

export async function listSyncAttempts({ page = 1, limit = 20, estado } = {}) {
  const where = estado ? { estado } : {};

  return SalesforceSync.findAndCountAll({
    where,
    order: [['fecha_creacion', 'DESC']],
    limit,
    offset: (page - 1) * limit,
  });
}