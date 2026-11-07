import { createTrial } from '../repository/descargas.repository.js';
export async function registerTrial(data = {}) {
  const clientId = Number(data.id_cliente);
  const productId = Number(data.id_producto);
  if (!Number.isInteger(clientId) || clientId < 1 || !Number.isInteger(productId) || productId < 1) {
    throw Object.assign(new Error('id_cliente e id_producto deben ser enteros positivos.'), { status: 400 });
  }
  return createTrial({ id_cliente: clientId, id_producto: productId });
}
