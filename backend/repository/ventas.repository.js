import { sequelize } from '../config/database.js';
import { AuditoriaCambio } from '../entity/auditoria-cambio.entity.js';
import { Cliente } from '../entity/cliente.entity.js';
import { DetalleVenta } from '../entity/detalle-venta.entity.js';
import { Producto } from '../entity/producto.entity.js';
import { Vendedor } from '../entity/vendedor.entity.js';
import { Venta } from '../entity/venta.entity.js';

export async function createSale({ id_cliente, id_vendedor, metodo_pago, items }) {
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
