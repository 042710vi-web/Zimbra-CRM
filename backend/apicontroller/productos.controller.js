/**
 * Recibe las solicitudes de productos, las entrega al servicio correspondiente y comunica el resultado.
 */
import { changeProductState, editProduct, listProducts, registerProduct } from '../service/Productos.service.js';

// HU-11: Devuelve el catálogo de productos con filtros y paginación.
export async function list(req, res, next) {
  try { res.json(await listProducts(req.query, req.user)); } catch (error) { next(error); }
}

// HU-10: Registra un producto nuevo en el catálogo.
export async function create(req, res, next) {
  try { res.status(201).json(await registerProduct(req.body)); } catch (error) { next(error); }
}

// HU-11: Actualiza los datos editables del producto.
export async function update(req, res, next) {
  try { res.json(await editProduct(req.body, req.user)); } catch (error) { next(error); }
}

// HU-12: Cambia la disponibilidad del producto sin eliminarlo.
export async function changeStatus(req, res, next) {
  try { res.json(await changeProductState(req.body, req.user)); } catch (error) { next(error); }
}