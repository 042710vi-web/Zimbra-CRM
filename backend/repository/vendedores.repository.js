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

export async function updateVendor({ id_vendedor, nombre_vendedor, correo_vendedor }) {
  const vendor = await Vendedor.findByPk(id_vendedor);
  if (!vendor) throw Object.assign(new Error('No existe el vendedor indicado.'), { status: 404 });
  await vendor.update({ nombre_vendedor: nombre_vendedor.trim(), correo_vendedor: correo_vendedor.trim().toLowerCase() });
  return vendor;
}

export async function setVendorState({ id_vendedor, estado }) {
  const vendor = await Vendedor.findByPk(id_vendedor);
  if (!vendor) throw Object.assign(new Error('No existe el vendedor indicado.'), { status: 404 });
  if (!estado) {
    const { Asignacion } = await import('../entity/AsignacionesCrm.entity.js');
    const active = await Asignacion.count({ where: { id_vendedor, estado: 'Activa' } });
    if (active) throw Object.assign(new Error('Finaliza o reasigna las asignaciones activas antes de desactivar al vendedor.'), { status: 409 });
  }
  await vendor.update({ estado });
  return { id_vendedor, estado, message: 'Estado del vendedor actualizado.' };
}
