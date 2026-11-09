/**
 * Consulta y guarda en la base de datos la información de productos.
 */
import { Op } from 'sequelize';
import { sequelize } from '../config/database.js';
import { Producto } from '../entity/Productos.entity.js';
import { registerChanges } from './AuditoriaCambios.repository.js';

// Busca productos por tipo, disponibilidad o nombre y devuelve su fecha de creación.
export async function listProducts({ tipo_licencia, estado, q, page, limit, offset }) {
  const where = {};
  if (tipo_licencia) where.tipo_licencia = tipo_licencia;
  if (estado !== undefined) where.estado = estado;
  if (q) where.nombre_producto = { [Op.like]: `%${q}%` };
  const result = await Producto.findAndCountAll({
    where,
    order: [['nombre_producto', 'ASC']],
    limit,
    offset,
    raw: true,
  });
  return {
    data: result.rows.map((row) => ({ ...row, precio: Number(row.precio) })),
    pagination: { page, limit, total: Number(result.count), pages: Math.ceil(result.count / limit) },
  };
}

// Guarda un producto nuevo y registra su creación.
export async function createProduct(data) {
  return sequelize.transaction(async (transaction) => {
    const duplicate = await Producto.findOne({
      where: { nombre_producto: data.nombre_producto, tipo_licencia: data.tipo_licencia },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (duplicate) throw Object.assign(new Error('Ya existe un producto con ese nombre y tipo de licencia.'), { status: 409 });
    const product = await Producto.create({ ...data, estado: true }, { transaction });
    await registerChanges({
      tabla: 'productos', idRegistro: product.id_producto, usuario: 'zimbra-api', transaction,
      cambios: { estado: [null, 'Activo'] },
    });
    return product.id_producto;
  });
}

// Actualiza el catálogo y deja constancia de los valores que cambiaron.
export async function updateProduct({ id_producto, ...changes }, usuario) {
  return sequelize.transaction(async (transaction) => {
    const product = await Producto.findByPk(id_producto, { transaction, lock: transaction.LOCK.UPDATE });
    if (!product) throw Object.assign(new Error('El producto indicado no existe.'), { status: 404 });
    const before = product.get({ plain: true });
    const duplicate = await Producto.findOne({
      where: { nombre_producto: changes.nombre_producto, tipo_licencia: changes.tipo_licencia, id_producto: { [Op.ne]: id_producto } },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (duplicate) throw Object.assign(new Error('Ya existe otro producto con ese nombre y tipo de licencia.'), { status: 409 });
    await product.update(changes, { transaction });
    await registerChanges({
      tabla: 'productos', idRegistro: id_producto, usuario, transaction,
      cambios: Object.fromEntries(Object.keys(changes).map((field) => [field, [before[field], changes[field]]])),
    });
    return id_producto;
  });
}

// Activa o pausa un producto sin borrar sus ventas y pruebas históricas.
export async function changeProductStatus({ id_producto, estado }, usuario) {
  return sequelize.transaction(async (transaction) => {
    const product = await Producto.findByPk(id_producto, { transaction, lock: transaction.LOCK.UPDATE });
    if (!product) throw Object.assign(new Error('El producto indicado no existe.'), { status: 404 });
    const previous = Boolean(product.estado);
    await product.update({ estado }, { transaction });
    await registerChanges({
      tabla: 'productos', idRegistro: id_producto, usuario, transaction,
      cambios: { estado: [previous ? 'Activo' : 'Inactivo', estado ? 'Activo' : 'Inactivo'] },
    });
  });
}