/**
 * Valida los datos y coordina las operaciones necesarias para gestionar productos.
 */
import {
  changeProductStatus as saveProductStatus,
  createProduct,
  listProducts as readProducts,
  updateProduct as saveProduct,
} from '../repository/Productos.repository.js';
import { httpError, pagination, requireId, requireOneOf, requireText } from '../utils/validators.js';

const LICENSE_TYPES = ['Gratuita', 'Prueba 60 dias', 'Comercial'];

/** Apoya la gestión de productos mediante una tarea interna del sistema. */
function validatePrice(type, value) {
  const price = Number(value);
  if (!Number.isFinite(price) || price < 0) throw httpError(400, 'El precio debe ser un número igual o mayor que cero.');
  if (type === 'Comercial' && price <= 0) throw httpError(400, 'Una licencia comercial debe tener un precio mayor que cero.');
  if (type !== 'Comercial' && price !== 0) throw httpError(400, 'Las licencias gratuitas y de prueba deben tener precio cero.');
  return Number(price.toFixed(2));
}

/** Apoya la gestión de productos mediante una tarea interna del sistema. */
function validateProduct(data = {}) {
  const nombre_producto = requireText(data.nombre_producto, 'El nombre del producto', 100);
  const tipo_licencia = requireOneOf(data.tipo_licencia, 'El tipo de licencia', LICENSE_TYPES);
  const precio = validatePrice(tipo_licencia, data.precio);
  return { nombre_producto, tipo_licencia, precio };
}

/** Apoya la gestión de productos mediante una tarea interna del sistema. */
function parseState(value) {
  if (value === undefined || value === null || value === '') return undefined;
  if ([true, 1, '1', 'true', 'activo', 'Activa'].includes(value)) return true;
  if ([false, 0, '0', 'false', 'inactivo', 'Inactiva'].includes(value)) return false;
  throw httpError(400, 'estado debe ser activo o inactivo.');
}

// HU-11: Presenta el catálogo con los filtros y el acceso que corresponden al rol.
export async function listProducts(query = {}, user = {}) {
  const tipo_licencia = query.tipo_licencia
    ? requireOneOf(query.tipo_licencia, 'El tipo de licencia', LICENSE_TYPES)
    : undefined;
  const estado = parseState(query.estado);
  const filters = { tipo_licencia, estado, q: String(query.q || '').trim(), ...pagination(query) };
  if (user.role === 'Vendedor') filters.estado = true;
  return readProducts(filters);
}

// HU-10: Valida los datos antes de registrar un producto activo.
export async function registerProduct(data = {}) {
  const product = validateProduct(data);
  const id_producto = await createProduct(product);
  return { id_producto, message: 'Producto registrado correctamente.' };
}

// HU-11: Actualiza el catálogo sin modificar los precios ya guardados en ventas.
export async function editProduct(data = {}, user = {}) {
  const id_producto = requireId(data.id_producto, 'El producto');
  const product = validateProduct(data);
  await saveProduct({ id_producto, ...product }, user.email);
  return { id_producto, message: 'Producto actualizado correctamente.' };
}

// HU-12: Cambia la disponibilidad sin eliminar el historial del producto.
export async function changeProductState(data = {}, user = {}) {
  const id_producto = requireId(data.id_producto, 'El producto');
  const estado = parseState(data.estado);
  if (estado === undefined) throw httpError(400, 'estado es obligatorio.');
  await saveProductStatus({ id_producto, estado }, user.email);
  return { id_producto, estado, message: `Producto ${estado ? 'activado' : 'desactivado'} correctamente.` };
}