import { readModule } from './modulos.service.js';

// HU-08: consultar el catálogo de productos.
// Endpoint: GET /api/products.
export function listProducts(token, params = {}) {
  return readModule(token, '/products', params);
}
