import { createAssignment } from '../repository/asignaciones.repository.js';
export async function assignClient(data = {}) {
  const clientId = Number(data.id_cliente);
  const vendorId = Number(data.id_vendedor);
  if (![clientId, vendorId].every((id) => Number.isInteger(id) && id > 0)) {
    throw Object.assign(new Error('id_cliente e id_vendedor deben ser enteros positivos.'), { status: 400 });
  }
  return createAssignment({ id_cliente: clientId, id_vendedor: vendorId });
}
