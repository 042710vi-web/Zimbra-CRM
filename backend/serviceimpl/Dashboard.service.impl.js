/**
 * Valida los datos y coordina las operaciones necesarias para gestionar dashboard.
 */
import { getDashboard as readDashboard } from '../repository/Dashboard.repository.js';
import { httpError, requireId } from '../utils/validators.js';

// HU-34: Limita los datos al vendedor conectado o aplica el filtro de administración.
export async function getDashboard(query = {}, user = {}) {
  if (user.role === 'Vendedor') {
    if (!user.vendorId) throw httpError(403, 'La cuenta no está vinculada a un vendedor.');
    return readDashboard({ id_vendedor: requireId(user.vendorId, 'El vendedor') });
  }
  const id_vendedor = query.id_vendedor ? requireId(query.id_vendedor, 'id_vendedor') : undefined;
  return readDashboard({ id_vendedor });
}