import { Op } from 'sequelize';
import { Empresa } from '../entity/empresa.entity.js';

export const findCompanies = (q) => Empresa.findAll({
  where: q ? { nombre_empresa: { [Op.like]: `%${q}%` } } : undefined,
  order: [['nombre_empresa', 'ASC']],
  raw: true,
});

export async function createCompany(data) {
  const company = await Empresa.create(data);
  return company.id_empresa;
}
