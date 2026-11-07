import { Producto } from '../entity/producto.entity.js';
export async function listProducts() {
  const rows = await Producto.findAll({
    attributes: ['id_producto', 'nombre_producto', 'tipo_licencia', 'precio'],
    where: { estado: true },
    order: [['nombre_producto', 'ASC']],
    raw: true,
  });
  return rows.map((row) => ({ ...row, precio: Number(row.precio) }));
}
