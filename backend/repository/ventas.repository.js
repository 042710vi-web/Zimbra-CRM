import { sequelize } from '../config/database.js';
import { AuditoriaCambio } from '../entity/auditoria-cambio.entity.js';
import { Cliente } from '../entity/cliente.entity.js';
import { DetalleVenta } from '../entity/detalle_venta.entity.js';
import { Producto } from '../entity/producto.entity.js';
import { Vendedor } from '../entity/vendedor.entity.js';
import { Venta } from '../entity/venta.entity.js';
import { QueryTypes } from 'sequelize';

export async function listSales({ filters, page, limit, id_vendedor }) {
  const clauses = ['1=1']; const replacements = { limit, offset: (page - 1) * limit };
  const map = { id_cliente: 'v.id_cliente', id_vendedor: 'v.id_vendedor', estado_venta: 'v.estado_venta' };
  for (const [key, column] of Object.entries(map)) if (filters[key] !== undefined) { clauses.push(`${column} = :${key}`); replacements[key] = filters[key]; }
  if (id_vendedor) { clauses.push('v.id_vendedor = :owner'); replacements.owner = id_vendedor; }
  if (filters.desde) { clauses.push('v.fecha_venta >= :desde'); replacements.desde = filters.desde; }
  if (filters.hasta) { clauses.push('v.fecha_venta < DATE_ADD(:hasta, INTERVAL 1 DAY)'); replacements.hasta = filters.hasta; }
  const where = clauses.join(' AND ');
  const [count] = await sequelize.query(`SELECT COUNT(*) total FROM ventas v WHERE ${where}`, { replacements, type: QueryTypes.SELECT });
  const sales = await sequelize.query(`SELECT v.*, c.nombre_completo, vd.nombre_vendedor FROM ventas v JOIN clientes c ON c.id_cliente=v.id_cliente JOIN vendedores vd ON vd.id_vendedor=v.id_vendedor WHERE ${where} ORDER BY v.fecha_venta DESC LIMIT :limit OFFSET :offset`, { replacements, type: QueryTypes.SELECT });
  if (sales.length) {
    const ids = sales.map(s => s.id_venta);
    const details = await sequelize.query('SELECT d.*, p.nombre_producto FROM detalle_ventas d JOIN productos p ON p.id_producto=d.id_producto WHERE d.id_venta IN (:ids)', { replacements: { ids }, type: QueryTypes.SELECT });
    for (const sale of sales) sale.detalles = details.filter(d => d.id_venta === sale.id_venta);
  }
  return { rows: sales, count: Number(count.total) };
}

export async function createSale({ id_cliente, id_vendedor, numero_contrato, metodo_pago, items }) {
  return sequelize.transaction(async (transaction) => {
    const lock = { transaction, lock: transaction.LOCK.UPDATE };
    const client = await Cliente.findByPk(id_cliente, lock);
    if (!client) throw Object.assign(new Error('El cliente indicado no existe.'), { status: 404 });
    const vendor = await Vendedor.findOne({ where: { id_vendedor, estado: true }, ...lock });
    if (!vendor) throw Object.assign(new Error('El vendedor no existe o está inactivo.'), { status: 404 });

    const ids = [...new Set(items.map((item) => item.id_producto))];
    const products = await Producto.findAll({
      attributes: ['id_producto', 'precio'],
      where: { id_producto: ids, estado: true },
      ...lock,
    });
    if (products.length !== ids.length) throw Object.assign(new Error('Uno o más productos no existen o están inactivos.'), { status: 400 });
    const priceById = new Map(products.map((product) => [product.id_producto, Number(product.precio)]));
    const lines = items.map(({ id_producto, cantidad }) => {
      const price = priceById.get(id_producto);
      return { id_producto, cantidad, precio_unitario: price, subtotal: Number((price * cantidad).toFixed(2)) };
    });
    const total = Number(lines.reduce((sum, line) => sum + line.subtotal, 0).toFixed(2));
    const sale = await Venta.create({
      id_cliente,
      id_vendedor,
      numero_contrato: numero_contrato || null,
      estado_venta: 'Pendiente',
      metodo_pago: metodo_pago || null,
      total_venta: total,
    }, { transaction });
    await DetalleVenta.bulkCreate(lines.map((line) => ({ ...line, id_venta: sale.id_venta })), { transaction });
    await AuditoriaCambio.create({
      tabla: 'ventas',
      id_registro: sale.id_venta,
      campo: 'estado_venta',
      valor_anterior: null,
      valor_nuevo: 'Pendiente',
      usuario_bd: 'zimbra-api',
    }, { transaction });
    return { id_venta: sale.id_venta, total_venta: total, message: 'Venta registrada correctamente.' };
  });
}

export async function updateSale({ id_venta, metodo_pago, items, ownerId }) {
  return sequelize.transaction(async (transaction) => {
    const where = { id_venta, estado_venta: 'Pendiente' };
    if (ownerId) where.id_vendedor = ownerId;
    const sale = await Venta.findOne({ where, transaction, lock: transaction.LOCK.UPDATE });
    if (!sale) throw Object.assign(new Error('La venta no existe o no está pendiente.'), { status: 404 });
    const oldLines = await DetalleVenta.findAll({ where: { id_venta }, transaction, lock: transaction.LOCK.UPDATE });
    const existingByProduct = new Map(oldLines.map(line => [line.id_producto, line]));
    const idsToAdd = items.map(x => x.id_producto).filter(id => !existingByProduct.has(id));
    const products = idsToAdd.length ? await Producto.findAll({ where: { id_producto: idsToAdd, estado: true }, transaction, lock: transaction.LOCK.UPDATE }) : [];
    if (products.length !== new Set(idsToAdd).size) throw Object.assign(new Error('Uno o más productos nuevos no existen o están inactivos.'), { status: 400 });
    const prices = new Map(products.map(p => [p.id_producto, Number(p.precio)]));
    let total = 0;
    for (const item of items) {
      const existing = existingByProduct.get(item.id_producto);
      const price = existing ? Number(existing.precio_unitario) : prices.get(item.id_producto);
      const subtotal = Number((price * item.cantidad).toFixed(2)); total += subtotal;
      if (existing) await existing.update({ cantidad: item.cantidad, subtotal }, { transaction });
      else await DetalleVenta.create({ id_venta, id_producto: item.id_producto, cantidad: item.cantidad, precio_unitario: price, subtotal }, { transaction });
    }
    await sale.update({ metodo_pago: metodo_pago || sale.metodo_pago, total_venta: Number(total.toFixed(2)) }, { transaction });
    return { id_venta, total_venta: Number(total.toFixed(2)), message: 'Venta pendiente actualizada.' };
  });
}

export async function changeSaleStatus({ id_venta, estado_venta }) {
  return sequelize.transaction(async (transaction) => {
    const sale = await Venta.findByPk(id_venta, { transaction, lock: transaction.LOCK.UPDATE });
    if (!sale) throw Object.assign(new Error('No existe la venta indicada.'), { status: 404 });
    if (sale.estado_venta !== 'Pendiente') throw Object.assign(new Error('Solo se puede cambiar el estado de una venta pendiente.'), { status: 409 });
    await sale.update({ estado_venta }, { transaction });
    if (estado_venta === 'Completada') {
      await Cliente.update({ estado_cliente: 'Cliente' }, { where: { id_cliente: sale.id_cliente }, transaction });
      await sequelize.query("UPDATE descargas_prueba SET estado_prueba = 'Convertida' WHERE id_cliente = :id_cliente AND estado_prueba = 'Activa'", { replacements: { id_cliente: sale.id_cliente }, transaction });
    }
    await AuditoriaCambio.create({ tabla: 'ventas', id_registro: id_venta, campo: 'estado_venta', valor_anterior: 'Pendiente', valor_nuevo: estado_venta, usuario_bd: 'zimbra-api' }, { transaction });
    return { id_venta, estado_venta, message: 'Estado de venta actualizado.' };
  });
}
