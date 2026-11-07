import { listProducts } from '../service/productos.service.js';
export async function list(_req, res, next) {
  try { res.json(await listProducts()); } catch (error) { next(error); }
}
