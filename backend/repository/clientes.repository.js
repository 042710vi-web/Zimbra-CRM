import { QueryTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import { Cliente } from '../entity/cliente.entity.js';
import { Empresa } from '../entity/empresa.entity.js';
import { registerChanges } from './auditoria.repository.js';

// Busca o crea la empresa indicada por id o por nombre (se reutiliza al crear y al editar).
async function resolveCompanyId(data, transaction) {
  let companyId = data.id_empresa ? Number(data.id_empresa) : null;
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

// HU-08: cambia el estado del cliente (por ejemplo a Inactivo) y lo audita.
export async function updateClientStatus({ id_cliente, estado_cliente }, usuario) {
  return sequelize.transaction(async (transaction) => {
    const client = await Cliente.findByPk(id_cliente, { transaction, lock: transaction.LOCK.UPDATE });
    if (!client) throw Object.assign(new Error('El cliente indicado no existe.'), { status: 404 });
    const previous = client.estado_cliente;
    await client.update({ estado_cliente }, { transaction });
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
