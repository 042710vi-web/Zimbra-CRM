/**
 * Consulta y guarda en la base de datos la información de empresas.
 */
import { Op } from 'sequelize';
import { Empresa } from '../entity/Empresas.entity.js';
import { callProcedure } from './storedProcedures.repository.js';

export const findCompanies = (q) => Empresa.findAll({
  where: q ? { nombre_empresa: { [Op.like]: `%${q}%` } } : undefined,
  order: [['nombre_empresa', 'ASC']],
  raw: true,
});

/** Realiza la consulta o el cambio de información solicitado. */
export async function createCompany(data) {
  const [rows] = await callProcedure('sp_registrar_empresa', [
    data.nombre_empresa, data.sector_industria || null, data.sitio_web || null,
  ]);
  return Number(rows[0]?.id_empresa);
}

export async function getCompanyDetails(id_empresa) {
  const [summary = [], clients = []] = await callProcedure('sp_detalle_empresa', [id_empresa]);
  return summary[0] ? { ...summary[0], clientes: clients } : null;
}
