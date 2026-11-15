import { api } from '../api/client.js';

// HU-08: consultar el catálogo de productos.
// Endpoint: GET /api/products.
export function listProducts(token) {
  return api('/products', { token });
}
