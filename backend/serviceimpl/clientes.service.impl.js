/**
 * Valida los datos y coordina las operaciones necesarias para gestionar clientes.
 */
import { createClient, findClients, updateClient as saveClient, updateClientStatus } from '../repository/Clientes.repository.js';
import {
  CLIENT_STATES, optionalId, optionalPhone, optionalText, optionalUrl, pagination,
  requireEmail, requireId, requireOneOf, requireText,
} from '../utils/validators.js';

// HU-36: valida y normaliza los datos antes de llegar a la base de datos.
function cleanClientData(data) {
  return {
    ...('id_empresa' in data ? { id_empresa: optionalId(data.id_empresa, 'La empresa') } : {}),
    nombre_completo: requireText(data.nombre_completo, 'El nombre completo', 150),
    correo_electronico: requireEmail(data.correo_electronico),
    telefono: optionalPhone(data.telefono),
    nombre_empresa: optionalText(data.nombre_empresa, 'El nombre de la empresa', 150),
    sector_industria: optionalText(data.sector_industria, 'El sector', 100),
    sitio_web: optionalUrl(data.sitio_web),
  };
}

// HU-05
/** Aplica las validaciones y coordina esta operación antes de guardar o consultar información. */
export async function registerClient(data = {}) {
  const id = await createClient(cleanClientData(data));
  return { id_cliente: id, message: 'Cliente registrado correctamente.' };
}

// HU-06
/** Aplica las validaciones y coordina esta operación antes de guardar o consultar información. */
export async function listClients(query = {}) {
  const estado = query.estado ? requireOneOf(query.estado, 'El estado', CLIENT_STATES) : null;
  return findClients({ q: String(query.q || '').trim(), estado, ...pagination(query) });
}

// HU-07
/** Aplica las validaciones y coordina esta operación antes de guardar o consultar información. */
export async function updateClient(data = {}, user) {
  const id_cliente = requireId(data.id_cliente, 'El cliente');
  await saveClient({ ...cleanClientData(data), id_cliente }, user?.email);
  return { id_cliente, message: 'Cliente actualizado correctamente.' };
}

// HU-08
/** Aplica las validaciones y coordina esta operación antes de guardar o consultar información. */
export async function changeClientStatus(data = {}, user) {
  const id_cliente = requireId(data.id_cliente, 'El cliente');
  const estado_cliente = requireOneOf(data.estado_cliente, 'El estado', CLIENT_STATES);
  await updateClientStatus({ id_cliente, estado_cliente }, user?.email);
  return { id_cliente, estado_cliente, message: `Estado del cliente cambiado a ${estado_cliente}.` };
}