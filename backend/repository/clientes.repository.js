/**
 * Consulta y guarda en la base de datos la información de clientes.
 */
import { QueryTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import { Cliente } from '../entity/Clientes.entity.js';
import { Empresa } from '../entity/Empresas.entity.js';
import { registerChanges } from './AuditoriaCambios.repository.js';
import { callProcedure } from './storedProcedures.repository.js';

async function resolveCompanyId(data, transaction) {
  if (data.id_empresa) return Number(data.id_empresa);

  if (!data.nombre_empresa) return null;

  const [company] = await Empresa.findOrCreate({
    where: { nombre_empresa: data.nombre_empresa.trim() },
    defaults: {
      sector_industria: data.sector_industria || null,
      sitio_web: data.sitio_web || null,
    },
    transaction,
  });

  return company.id_empresa;
}

/** Realiza la consulta o el cambio de información solicitado. */
export async function createClient(data) {
  const id_empresa = await sequelize.transaction((transaction) => resolveCompanyId(data, transaction));
  const [rows] = await callProcedure('sp_registrar_cliente', [
    id_empresa,
    data.nombre_completo.trim(),
    data.correo_electronico.trim().toLowerCase(),
    data.telefono || null,
  ]);
  return Number(rows[0]?.id_cliente);
}

// HU-04: crea o actualiza un lead enviado desde el sitio público.
// Si hay clave de rastreo, asocia sus actividades web previas al cliente.
export async function upsertPublicLead(data, clave_rastreo) {
  return sequelize.transaction(async (transaction) => {
    // HU-04/HU-15: coordina formulario y eventos con el mismo bloqueo de visitante.
    let visitante;
    if (clave_rastreo) {
      await sequelize.query(
        'INSERT INTO visitantes_web(clave_rastreo) VALUES (:clave) ON DUPLICATE KEY UPDATE clave_rastreo = VALUES(clave_rastreo)',
        { replacements: { clave: clave_rastreo }, transaction },
      );
      [visitante] = await sequelize.query(
        'SELECT id_cliente FROM visitantes_web WHERE clave_rastreo = :clave FOR UPDATE',
        { replacements: { clave: clave_rastreo }, type: QueryTypes.SELECT, transaction },
      );
    }
    const correo = data.correo_electronico.trim().toLowerCase();
    let client = await Cliente.findOne({
      where: { correo_electronico: correo },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    const id_empresa = await resolveCompanyId(data, transaction);

    if (client) {
      const before = client.get({ plain: true });
      const next = {
        nombre_completo: data.nombre_completo.trim(),
        telefono: data.telefono || null,
        id_empresa,
      };

      await client.update(next, { transaction });

      await registerChanges({
        tabla: 'clientes',
        idRegistro: client.id_cliente,
        usuario: 'formulario público',
        transaction,
        cambios: Object.fromEntries(
          Object.keys(next).map((field) => [
            field,
            [before[field], next[field]],
          ]),
        ),
      });
    } else {
      client = await Cliente.create(
        {
          id_empresa,
          nombre_completo: data.nombre_completo.trim(),
          correo_electronico: correo,
          telefono: data.telefono || null,
          puntaje_total: 0,
          estado_cliente: 'Frio',
        },
        { transaction },
      );
    }

    if (clave_rastreo) {
      if (visitante.id_cliente && Number(visitante.id_cliente) !== Number(client.id_cliente)) {
        throw Object.assign(new Error('La clave del visitante ya pertenece a otro cliente.'), { status: 409 });
      }
      await sequelize.query(
        'UPDATE visitantes_web SET id_cliente = :id_cliente WHERE clave_rastreo = :clave_rastreo',
        { replacements: { id_cliente: client.id_cliente, clave_rastreo }, transaction },
      );
      await sequelize.query(
        `UPDATE actividad_web
         SET id_cliente = :id_cliente,
             clave_rastreo = NULL
         WHERE clave_rastreo = :clave_rastreo AND id_cliente IS NULL
         ORDER BY fecha_actividad, id_actividad`,
        {
          replacements: {
            id_cliente: client.id_cliente,
            clave_rastreo,
          },
          transaction,
        },
      );
    }

    return client.id_cliente;
  });
}

export async function findClients({ q, estado, page, limit, offset }) {
  const replacements = {
    q: q || null,
    like: `%${q || ''}%`,
    estado: estado || null,
    limit,
    offset,
  };

  const where = `
    WHERE (:q IS NULL
      OR c.nombre_completo LIKE :like
      OR c.correo_electronico LIKE :like
      OR e.nombre_empresa LIKE :like)
      AND (:estado IS NULL OR c.estado_cliente = :estado)
  `;

  const [data] = await callProcedure('sp_listar_clientes', [q || null, estado || null, limit, offset]);

  const [count] = await sequelize.query(
    `SELECT COUNT(*) AS total
     FROM clientes c
     LEFT JOIN empresas e ON e.id_empresa = c.id_empresa
     ${where}`,
    { replacements, type: QueryTypes.SELECT },
  );

  const total = Number(count.total);

  return {
    data,
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

// HU-05: devuelve el cliente y el historial disponible en las tablas actuales.
export async function findClientDetail(id_cliente) {
  const [client] = await sequelize.query(
    `SELECT
        c.id_cliente,
        c.id_empresa,
        c.nombre_completo,
        c.correo_electronico,
        c.telefono,
        c.fecha_registro,
        c.puntaje_total,
        c.estado_cliente,
        e.nombre_empresa,
        e.sector_industria,
        e.sitio_web
     FROM clientes c
     LEFT JOIN empresas e ON e.id_empresa = c.id_empresa
     WHERE c.id_cliente = :id_cliente
     LIMIT 1`,
    {
      replacements: { id_cliente },
      type: QueryTypes.SELECT,
    },
  );

  if (!client) return null;

  const [assignments, trials, activities, interactions, sales] =
    await Promise.all([
      sequelize.query(
        `SELECT a.id_asignacion, a.id_vendedor, a.fecha_asignacion,
                a.fecha_fin, a.estado, v.nombre_vendedor
         FROM asignaciones_crm a
         JOIN vendedores v ON v.id_vendedor = a.id_vendedor
         WHERE a.id_cliente = :id_cliente
         ORDER BY a.fecha_asignacion DESC`,
        {
          replacements: { id_cliente },
          type: QueryTypes.SELECT,
        },
      ),

      sequelize.query(
        `SELECT d.id_descarga, d.fecha_inicio, d.fecha_fin,
                d.estado_prueba, p.id_producto, p.nombre_producto
         FROM descargas_prueba d
         JOIN productos p ON p.id_producto = d.id_producto
         WHERE d.id_cliente = :id_cliente
         ORDER BY d.fecha_inicio DESC`,
        {
          replacements: { id_cliente },
          type: QueryTypes.SELECT,
        },
      ),

      sequelize.query(
        `SELECT aw.id_actividad, aw.fecha_actividad, aw.detalle,
                ac.nombre_accion, aw.puntaje_otorgado AS puntaje, aw.es_retorno, cm.nombre_campana
         FROM actividad_web aw
         JOIN acciones_marketing ac ON ac.id_accion = aw.id_accion
         LEFT JOIN campanas_marketing cm ON cm.id_campana = aw.id_campana
         WHERE aw.id_cliente = :id_cliente
         ORDER BY aw.fecha_actividad DESC`,
        {
          replacements: { id_cliente },
          type: QueryTypes.SELECT,
        },
      ),

      sequelize.query(
        `SELECT i.id_interaccion, i.tipo_interaccion, i.resultado,
                i.fecha_interaccion, i.notas, v.nombre_vendedor
         FROM interacciones i
         JOIN asignaciones_crm a ON a.id_asignacion = i.id_asignacion
         JOIN vendedores v ON v.id_vendedor = a.id_vendedor
         WHERE a.id_cliente = :id_cliente
         ORDER BY i.fecha_interaccion DESC`,
        {
          replacements: { id_cliente },
          type: QueryTypes.SELECT,
        },
      ),

      sequelize.query(
        `SELECT v.id_venta, v.numero_contrato, v.fecha_venta,
                v.estado_venta, v.metodo_pago, v.total_venta,
                ven.nombre_vendedor
         FROM ventas v
         JOIN vendedores ven ON ven.id_vendedor = v.id_vendedor
         WHERE v.id_cliente = :id_cliente
         ORDER BY v.fecha_venta DESC`,
        {
          replacements: { id_cliente },
          type: QueryTypes.SELECT,
        },
      ),
    ]);
  return {
    ...client,
    historial: {
      asignaciones: assignments,
      pruebas: trials,
      actividadWeb: activities,
      interacciones: interactions,
      ventas: sales,
    },
  };
}

export async function updateClient(data, usuario) {
  const existing = await Cliente.findByPk(data.id_cliente);
  if (!existing) throw Object.assign(new Error('El cliente indicado no existe.'), { status: 404 });
  const id_empresa = data.id_empresa !== undefined || data.nombre_empresa
    ? await sequelize.transaction((transaction) => resolveCompanyId(data, transaction))
    : existing.id_empresa;
  const [rows] = await callProcedure('sp_actualizar_cliente', [
    data.id_cliente, id_empresa, data.nombre_completo,
    data.correo_electronico, data.telefono || null,
  ]);
  return Number(rows[0]?.id_cliente || data.id_cliente);
}

// Al inactivar un cliente, finaliza sus asignaciones activas en la misma transacción.
export async function updateClientStatus(
  { id_cliente, estado_cliente },
  usuario,
) {
  await callProcedure('sp_cambiar_estado_cliente', [id_cliente, estado_cliente]);
  return true;
}
