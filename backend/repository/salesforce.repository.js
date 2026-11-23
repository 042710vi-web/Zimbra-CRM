import { QueryTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import { SalesforceSync } from '../entity/salesforce-sync.entity.js';
import { callProcedure } from './storedProcedures.repository.js';

export async function findClientForSalesforce(id_cliente) {
  const rows = await sequelize.query(
    `SELECT
       c.id_cliente,
       c.nombre_completo,
       c.correo_electronico,
       c.telefono,
       c.estado_cliente,
       c.estado_salesforce,
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
  const [rows] = await callProcedure('sp_consultar_sincronizaciones_salesforce', [
    estado || null, null, null, null, limit, (page - 1) * limit,
  ]);
  const count = await SalesforceSync.count({ where });
  return { count, rows };
}

export async function markSimulatedSyncFailure(id_sincronizacion) {
  return sequelize.transaction(async (transaction) => {
    // Bloquea en un orden estable para reservar el siguiente ID sin otra tabla.
    const rows = await sequelize.query(
      'SELECT id_sincronizacion, salesforce_id FROM salesforce_sincronizaciones ORDER BY id_sincronizacion FOR UPDATE',
      { type: QueryTypes.SELECT, transaction },
    );
    const current = rows.find((row) => String(row.id_sincronizacion) === String(id_sincronizacion));
    if (!current) throw Object.assign(new Error('El intento de sincronización no existe.'), { status: 404 });
    const ids = rows.map((row) => /^SF-(\d+)$/.exec(row.salesforce_id || '')).filter(Boolean).map((match) => Number(match[1]));
    const next = Math.max(0, ...ids) + 1;
    if (!Number.isSafeInteger(next)) throw new Error('Se agotó el consecutivo simulado de Salesforce.');
    const salesforce_id = current.salesforce_id || `SF-${next}`;
    await SalesforceSync.update(
      {
        estado: 'Fallido',
        salesforce_id,
        mensaje_error: 'Fallo simulado de conexión',
        intentos: sequelize.literal('intentos + 1'),
        fecha_actualizacion: new Date(),
      },
      { where: { id_sincronizacion }, transaction },
    );
    return salesforce_id;
  });
}
