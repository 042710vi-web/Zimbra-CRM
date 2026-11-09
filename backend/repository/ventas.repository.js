/**
 * Consulta y guarda en la base de datos la información de ventas.
 */
import { sequelize } from '../config/database.js';
import { Cliente } from '../entity/Clientes.entity.js';
import { Asignacion } from '../entity/AsignacionesCrm.entity.js';
import { DetalleVenta } from '../entity/DetalleVentas.entity.js';
import { Producto } from '../entity/Productos.entity.js';
import { DescargaPrueba } from '../entity/DescargasPrueba.entity.js';
import { Vendedor } from '../entity/Vendedores.entity.js';
import { Venta } from '../entity/Ventas.entity.js';
import { Op, QueryTypes } from 'sequelize';
import { registerChanges } from './AuditoriaCambios.repository.js';

/** Apoya la gestión de ventas mediante una tarea interna del sistema. */
const toCents = (amount) => Math.round(Number(amount) * 100);
// El sistema compara licencias de un mismo grupo aunque sus nombres indiquen prueba o duración.
const productFamily = (name) => String(name)
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/\(\s*prueba\s*\)/g, '')
  .replace(/\b\d+\s+anos?\b/g, '')
  .replace(/\s+/g, ' ')
  .trim();

/** Realiza la consulta o el cambio de información solicitado. */
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

// El sistema registra ventas solo para clientes atendidos por un vendedor con asignación activa.
export async function createSale({ id_cliente, id_vendedor, numero_contrato, metodo_pago, items }) {
  return sequelize.transaction(async (transaction) => {
    const lock = { transaction, lock: transaction.LOCK.UPDATE };
    const client = await Cliente.findByPk(id_cliente, lock);
    if (!client) throw Object.assign(new Error('El cliente indicado no existe.'), { status: 404 });
    if (['Inactivo', 'Descartado'].includes(client.estado_cliente)) throw Object.assign(new Error('No se puede registrar una venta para un cliente inactivo o descartado.'), { status: 409 });
    const vendor = await Vendedor.findOne({ where: { id_vendedor, estado: true }, ...lock });
    if (!vendor) throw Object.assign(new Error('El vendedor no existe o está inactivo.'), { status: 404 });
    const assignment = await Asignacion.findOne({
      where: { id_cliente, id_vendedor, estado: 'Activa' }, ...lock,
    });
    if (!assignment) throw Object.assign(new Error('El vendedor debe tener una asignación activa con el cliente para registrar la venta.'), { status: 409 });

    const ids = [...new Set(items.map((item) => item.id_producto))];
    const products = await Producto.findAll({
      attributes: ['id_producto', 'precio'],
      where: { id_producto: ids, estado: true, tipo_licencia: 'Comercial' },
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
    await registerChanges({
      tabla: 'ventas', idRegistro: sale.id_venta, usuario: 'zimbra-api', transaction,
      cambios: { estado_venta: [null, 'Pendiente'] },
    });
    return { id_venta: sale.id_venta, total_venta: total, message: 'Venta registrada correctamente.' };
  });
}

/** Realiza la consulta o el cambio de información solicitado. */
export async function updateSale({ id_venta, metodo_pago, items, ownerId }) {
  return sequelize.transaction(async (transaction) => {
    const where = { id_venta, estado_venta: 'Pendiente' };
    if (ownerId) where.id_vendedor = ownerId;
    const sale = await Venta.findOne({ where, transaction, lock: transaction.LOCK.UPDATE });
    if (!sale) throw Object.assign(new Error('La venta no existe o no está pendiente.'), { status: 404 });
    const oldLines = await DetalleVenta.findAll({ where: { id_venta }, transaction, lock: transaction.LOCK.UPDATE });
    const existingByProduct = new Map(oldLines.map(line => [line.id_producto, line]));
    const idsToAdd = items.map(x => x.id_producto).filter(id => !existingByProduct.has(id));
    const products = idsToAdd.length ? await Producto.findAll({ where: { id_producto: idsToAdd, estado: true, tipo_licencia: 'Comercial' }, transaction, lock: transaction.LOCK.UPDATE }) : [];
    if (products.length !== new Set(idsToAdd).size) throw Object.assign(new Error('Uno o más productos nuevos no existen o están inactivos.'), { status: 400 });
    const prices = new Map(products.map(p => [p.id_producto, Number(p.precio)]));
    const requestedProductIds = new Set(items.map((item) => item.id_producto));
    for (const oldLine of oldLines) {
      if (!requestedProductIds.has(oldLine.id_producto)) await oldLine.destroy({ transaction });
    }
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

// El sistema completa la venta únicamente cuando sus productos y valores son consistentes.
export async function changeSaleStatus({ id_venta, estado_venta }) {
  return sequelize.transaction(async (transaction) => {
    const sale = await Venta.findByPk(id_venta, { transaction, lock: transaction.LOCK.UPDATE });
    if (!sale) throw Object.assign(new Error('No existe la venta indicada.'), { status: 404 });
    if (sale.estado_venta !== 'Pendiente') throw Object.assign(new Error('Solo se puede cambiar el estado de una venta pendiente.'), { status: 409 });
    let saleLines = [];
    if (estado_venta === 'Completada') {
      saleLines = await DetalleVenta.findAll({
        where: { id_venta }, transaction, lock: transaction.LOCK.UPDATE,
      });
      if (!saleLines.length) throw Object.assign(new Error('No se puede completar una venta sin productos.'), { status: 409 });
      for (const line of saleLines) {
        if (!Number.isInteger(Number(line.cantidad)) || Number(line.cantidad) < 1 || toCents(line.precio_unitario) < 1
          || toCents(line.subtotal) !== toCents(line.precio_unitario) * Number(line.cantidad)) {
          throw Object.assign(new Error('Uno de los productos de la venta tiene una cantidad, precio o subtotal inconsistente.'), { status: 409 });
        }
      }
      const detailTotal = saleLines.reduce((sum, line) => sum + toCents(line.subtotal), 0);
      if (detailTotal !== toCents(sale.total_venta)) {
        throw Object.assign(new Error('El total de la venta no coincide con la suma de sus productos. Actualice la venta antes de completarla.'), { status: 409 });
      }
      const distinctProductIds = [...new Set(saleLines.map((line) => line.id_producto))];
      const activeCommercialProducts = await Producto.findAll({
        attributes: ['id_producto'],
        where: { id_producto: distinctProductIds, estado: true, tipo_licencia: 'Comercial' },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (activeCommercialProducts.length !== distinctProductIds.length) {
        throw Object.assign(new Error('La venta contiene un producto comercial que ya no está activo.'), { status: 409 });
      }
    }
    await sale.update({ estado_venta }, { transaction });
    if (estado_venta === 'Completada') {
      const client = await Cliente.findByPk(sale.id_cliente, { transaction, lock: transaction.LOCK.UPDATE });
      const previousClientState = client.estado_cliente;
      await client.update({ estado_cliente: 'Cliente' }, { transaction });
      await registerChanges({
        tabla: 'clientes', idRegistro: client.id_cliente, usuario: 'zimbra-api', transaction,
        cambios: { estado_cliente: [previousClientState, 'Cliente'] },
      });
      const saleProductIds = [...new Set(saleLines.map((line) => line.id_producto))];
      const saleProducts = await Producto.findAll({
        attributes: ['nombre_producto'], where: { id_producto: saleProductIds }, transaction,
      });
      const purchasedFamilies = new Set(saleProducts.map((product) => productFamily(product.nombre_producto)));
      // La licencia de prueba y la comercial son filas distintas; se comparan sus nombres de familia.
      const trialProducts = purchasedFamilies.size
        ? await Producto.findAll({
          attributes: ['id_producto', 'nombre_producto'],
          where: { tipo_licencia: 'Prueba 60 dias' },
          transaction,
        })
        : [];
      const trialProductIds = trialProducts
        .filter((product) => purchasedFamilies.has(productFamily(product.nombre_producto)))
        .map((product) => product.id_producto);
      const trials = trialProductIds.length
        ? await DescargaPrueba.findAll({
          where: {
            id_cliente: sale.id_cliente,
            id_producto: trialProductIds,
            estado_prueba: 'Activa',
            fecha_fin: { [Op.gte]: sequelize.literal('CURRENT_DATE') },
          },
          transaction,
          lock: transaction.LOCK.UPDATE,
        })
        : [];
      for (const trial of trials) {
        const previousSaleId = trial.id_venta;
        await trial.update({ estado_prueba: 'Convertida', id_venta: sale.id_venta }, { transaction });
        await registerChanges({
          tabla: 'descargas_prueba', idRegistro: trial.id_descarga, usuario: 'zimbra-api', transaction,
          cambios: { estado_prueba: ['Activa', 'Convertida'], id_venta: [previousSaleId, sale.id_venta] },
        });
      }
    }
    await registerChanges({
      tabla: 'ventas', idRegistro: id_venta, usuario: 'zimbra-api', transaction,
      cambios: { estado_venta: ['Pendiente', estado_venta] },
    });
    return { id_venta, estado_venta, message: 'Estado de venta actualizado.' };
  });
}