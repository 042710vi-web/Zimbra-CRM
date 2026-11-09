/**
 * Consulta y guarda en la base de datos la información de empresas.
 */
import { Op } from 'sequelize';
import { Empresa } from '../entity/Empresas.entity.js';

/** Realiza la consulta o el cambio de información solicitado. */
export const findCompanies = (q) => Empresa.findAll({
  where: q ? { nombre_empresa: { [Op.like]: `%${q}%` } } : undefined,
  order: [['nombre_empresa', 'ASC']],
  raw: true,
});

/** Realiza la consulta o el cambio de información solicitado. */
export async function createCompany(data) {
  const company = await Empresa.create(data);
  return company.id_empresa;
}