import { createSale } from '../repository/ventas.repository.js';
export async function registerSale(data = {}) {
  const id_cliente = Number(data.id_cliente);
  const id_vendedor = Number(data.id_vendedor);
  if (!Number.isInteger(id_cliente) || id_cliente < 1 || !Number.isInteger(id_vendedor) || id_vendedor < 1 || !Array.isArray(data.items) || data.items.length === 0) {
    throw Object.assign(new Error('Indica cliente, vendedor y al menos un producto.'), { status: 400 });
  }
  const items = data.items.map(({ id_producto, cantidad }) => ({ id_producto: Number(id_producto), cantidad: Number(cantidad) }));
  if (items.some((item) => !Number.isInteger(item.id_producto) || item.id_producto < 1 || !Number.isInteger(item.cantidad) || item.cantidad < 1)) {
    throw Object.assign(new Error('Cada producto debe tener un ID válido y cantidad entera mayor a cero.'), { status: 400 });
  }
  return createSale({ id_cliente, id_vendedor, metodo_pago: data.metodo_pago, items });
}
