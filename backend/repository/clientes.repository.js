/**
 * Consulta y guarda en la base de datos la información de clientes.
 */
import { QueryTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import { Cliente } from '../entity/Clientes.entity.js';
import { Empresa } from '../entity/Empresas.entity.js';
import { Asignacion } from '../entity/AsignacionesCrm.entity.js';
import { registerChanges } from './AuditoriaCambios.repository.js';

// El sistema comprueba la empresa indicada o registra una nueva cuando se recibe su nombre.
async function resolveCompanyId(data, transaction) {
  let companyId = data.id_empresa ? Number(data.id_empresa) : null;
  if (companyId) {
    const company = await Empresa.findByPk(companyId, { transaction });
    if (!company) throw Object.assign(new Error('La empresa indicada no existe.'), { status: 404 });
  }
  if (!companyId && data.nombre_empresa?.trim()) {
    const [company] = await Empresa.findOrCreate({
      where: { nombre_empresa: data.nombre_empresa.trim() },
      defaults: {
        sector_industria: data.sector_industria || null,
        sitio_web: data.sitio_web || null,
      },
      transaction,
    });
    companyId = company.id_empresa;
  }
  return companyId;
}

/** Realiza la consulta o el cambio de información solicitado. */
export async function createClient(data) {
  return sequelize.transaction(async (transaction) => {
    const companyId = await resolveCompanyId(data, transaction);
    const client = await Cliente.create({
      id_empresa: companyId,
      nombre_completo: data.nombre_completo.trim(),
      correo_electronico: data.correo_electronico.trim().toLowerCase(),
      telefono: data.telefono || null,
    }, { transaction });
    return client.id_cliente;
  });
}

// HU-06: consulta con búsqueda, filtro por estado y paginación.
export async function findClients({ q, estado, page, limit, offset }) {
  const replacements = { q: q || null, like: `%${q || ''}%`, estado: estado || null, limit, offset };
  const where = `WHERE (:q IS NULL OR c.nombre_completo LIKE :like OR c.correo_electronico LIKE :like OR e.nombre_empresa LIKE :like)
    AND (:estado IS NULL OR c.estado_cliente = :estado)`;
  const rows = await sequelize.query(
    `SELECT c.id_cliente, c.id_empresa, c.nombre_completo, c.correo_electronico, c.telefono,
            c.fecha_registro, c.puntaje_total, c.estado_cliente, e.nombre_empresa
       FROM clientes c LEFT JOIN empresas e ON e.id_empresa = c.id_empresa
       ${where} ORDER BY c.id_cliente DESC LIMIT :limit OFFSET :offset`,
    { replacements, type: QueryTypes.SELECT },
  );
  const [{ total }] = await sequelize.query(
    `SELECT COUNT(*) AS total FROM clientes c LEFT JOIN empresas e ON e.id_empresa = c.id_empresa ${where}`,
    { replacements, type: QueryTypes.SELECT },
  );
  return { data: rows, page, limit, total: Number(total), totalPages: Math.max(1, Math.ceil(Number(total) / limit)) };
}

// HU-07: actualiza los datos de contacto y deja rastro de cada campo modificado (HU-35).
export async function updateClient(data, usuario) {
  return sequelize.transaction(async (transaction) => {
    const client = await Cliente.findByPk(data.id_cliente, { transaction, lock: transaction.LOCK.UPDATE });
    if (!client) throw Object.assign(new Error('El cliente indicado no existe.'), { status: 404 });
    const before = client.get({ plain: true });
    const next = {
      nombre_completo: data.nombre_completo,
      correo_electronico: data.correo_electronico,
      telefono: data.telefono,
      id_empresa: 'id_empresa' in data || data.nombre_empresa ? await resolveCompanyId(data, transaction) : before.id_empresa,
    };
    await client.update(next, { transaction });
    await registerChanges({
      tabla: 'clientes',
      idRegistro: client.id_cliente,
      usuario,
      transaction,
      cambios: Object.fromEntries(Object.keys(next).map((campo) => [campo, [before[campo], next[campo]]])),
    });
    return client.id_cliente;
  });
}

// HU-08: el sistema actualiza el estado y finaliza la asignación si el cliente queda Inactivo.
export async function updateClientStatus({ id_cliente, estado_cliente }, usuario) {
  return sequelize.transaction(async (transaction) => {
    const client = await Cliente.findByPk(id_cliente, { transaction, lock: transaction.LOCK.UPDATE });
    if (!client) throw Object.assign(new Error('El cliente indicado no existe.'), { status: 404 });
    const previous = client.estado_cliente;
    await client.update({ estado_cliente }, { transaction });
    if (estado_cliente === 'Inactivo') {
      const activeAssignment = await Asignacion.findOne({
        where: { id_cliente, estado: 'Activa' }, transaction, lock: transaction.LOCK.UPDATE,
      });
      if (activeAssignment) {
        const previousAssignment = activeAssignment.get({ plain: true });
        const fecha_fin = new Date();
        await activeAssignment.update({ estado: 'Finalizada', fecha_fin }, { transaction });
        await registerChanges({
          tabla: 'asignaciones_crm', idRegistro: activeAssignment.id_asignacion, usuario, transaction,
          cambios: {
            estado: [previousAssignment.estado, 'Finalizada'],
            fecha_fin: [previousAssignment.fecha_fin, fecha_fin],
          },
        });
      }
    }
    await registerChanges({
      tabla: 'clientes',
      idRegistro: id_cliente,
      usuario,
      transaction,
      cambios: { estado_cliente: [previous, estado_cliente] },
    });
    return { previous };
  });
}