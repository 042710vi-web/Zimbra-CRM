/**
 * Consulta y guarda en la base de datos la información de vendedores.
 */
import { Vendedor } from '../entity/Vendedores.entity.js';

/** Realiza la consulta o el cambio de información solicitado. */
export async function listVendors({ search, page, limit }) {
  const { Op } = await import('sequelize');
  const where = search ? { [Op.or]: [
    { nombre_vendedor: { [Op.like]: `%${search}%` } },
    { correo_vendedor: { [Op.like]: `%${search}%` } },
  ] } : {};
  return Vendedor.findAndCountAll({ where, order: [['nombre_vendedor', 'ASC']], limit, offset: (page - 1) * limit });
}

/** Realiza la consulta o el cambio de información solicitado. */
export async function createVendor(data) {
  return Vendedor.create({ nombre_vendedor: data.nombre_vendedor.trim(), correo_vendedor: data.correo_vendedor.trim().toLowerCase(), estado: data.estado ?? true });
}