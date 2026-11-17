/** HU-07 y HU-08 - Productos y licencias.
 * Recibe las solicitudes y devuelve las respuestas.
 */
import { changeProductState, editProduct, listProducts, registerProduct } from '../service/productos.service.js';

// HU-08: Devuelve el catálogo de productos con filtros y paginación.
export async function list(req, res, next) {
  try { res.json(await listProducts(req.query, req.user)); } catch (error) { next(error); }
}

// HU-07: Registra un producto nuevo en el catálogo.
export async function create(req, res, next) {
  try { res.status(201).json(await registerProduct(req.body, req.user)); } catch (error) { next(error); }
}

// HU-08: Actualiza los datos editables del producto.
export async function update(req, res, next) {
  try { res.json(await editProduct({ ...req.body, id_producto: req.body?.id_producto ?? req.params.id }, req.user)); } catch (error) { next(error); }
}

// HU-08: Cambia la disponibilidad del producto sin eliminarlo.
export async function changeStatus(req, res, next) {
  try { res.json(await changeProductState({ ...req.body, id_producto: req.body?.id_producto ?? req.params.id }, req.user)); } catch (error) { next(error); }
}
