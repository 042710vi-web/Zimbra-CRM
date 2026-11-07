import { createClient } from '../repository/clientes.repository.js';

export async function registerClient(data = {}) {
  if (!data.nombre_completo?.trim() || !/^\S+@\S+\.\S+$/.test(data.correo_electronico || '')) {
    throw Object.assign(new Error('Nombre y correo electrónico válido son obligatorios.'), { status: 400 });
  }
  const id = await createClient(data);
  return { id_cliente: id, message: 'Cliente registrado correctamente.' };
}
