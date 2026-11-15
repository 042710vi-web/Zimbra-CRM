import { QueryTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import { Empresa } from '../entity/empresa.entity.js';
import { registerChanges } from './auditoria.repository.js';

export async function findCompanies(q = '') {
  return Empresa.findAll({
    where: q
      ? {
          nombre_empresa: sequelize.where(
            sequelize.fn('LOWER', sequelize.col('nombre_empresa')),
            {
              [sequelize.Sequelize.Op.like]: `%${q.toLowerCase()}%`,
            },
          ),
        }
      : undefined,
    order: [['nombre_empresa', 'ASC']],
    raw: true,
  });
}

export async function findCompanyDetail(id_empresa) {
  const [empresa] = await sequelize.query(
    `SELECT id_empresa, nombre_empresa, sector_industria, sitio_web
     FROM empresas
     WHERE id_empresa = :id_empresa
     LIMIT 1`,
    {
      replacements: { id_empresa },
      type: QueryTypes.SELECT,
    },
  );

  if (!empresa) return null;

  const clientes = await sequelize.query(
    `SELECT
        c.id_cliente,
        c.nombre_completo,
        c.correo_electronico,
        c.estado_cliente,
        COUNT(CASE WHEN v.estado_venta = 'Completada' THEN 1 END)
          AS ventas_completadas,
        COALESCE(
          SUM(CASE WHEN v.estado_venta = 'Completada'
                   THEN v.total_venta ELSE 0 END),
          0
        ) AS total_ventas
     FROM clientes c
     LEFT JOIN ventas v ON v.id_cliente = c.id_cliente
     WHERE c.id_empresa = :id_empresa
     GROUP BY
       c.id_cliente,
       c.nombre_completo,
       c.correo_electronico,
       c.estado_cliente
     ORDER BY c.nombre_completo`,
    {
      replacements: { id_empresa },
      type: QueryTypes.SELECT,
    },
  );

  return { ...empresa, clientes };
}

export async function createCompany(data) {
  const company = await Empresa.create(data);
  return company.id_empresa;
}

export async function updateCompany(data, usuario) {
  return sequelize.transaction(async (transaction) => {
    const company = await Empresa.findByPk(data.id_empresa, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!company) {
      throw Object.assign(
        new Error('La empresa indicada no existe.'),
        { status: 404 },
      );
    }

    const before = company.get({ plain: true });

    const next = {
      nombre_empresa: data.nombre_empresa,
      sector_industria: data.sector_industria,
      sitio_web: data.sitio_web,
    };

    await company.update(next, { transaction });

    await registerChanges({
      tabla: 'empresas',
      idRegistro: company.id_empresa,
      usuario,
      transaction,
      cambios: Object.fromEntries(
        Object.keys(next).map((field) => [
          field,
          [before[field], next[field]],
        ]),
      ),
    });

    return company.id_empresa;
  });
}