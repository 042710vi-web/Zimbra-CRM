/**
 * Valida los datos y coordina las operaciones necesarias para gestionar usuarios.
 */
import { createUser, findActiveVendor, findUsers, updateUserStatus } from '../repository/Usuarios.repository.js';
import { hashPassword } from '../utils/hash.js';
import {
  USER_ROLES, httpError, requireEmail, requireId, requireOneOf, requirePassword,
} from '../utils/validators.js';

/** Apoya la gestión de usuarios mediante una tarea interna del sistema. */
function toBoolean(value, label) {
  if (value === true || value === 1 || value === '1' || value === 'true') return true;
  if (value === false || value === 0 || value === '0' || value === 'false') return false;
  throw httpError(400, `${label} debe ser verdadero o falso.`);
}

// HU-04: listar usuarios del sistema (con filtros opcionales).
export function listUsers(query = {}) {
  const rol = query.rol ? requireOneOf(query.rol, 'El rol', USER_ROLES) : null;
  const estado = query.estado === undefined || query.estado === '' ? null : Number(toBoolean(query.estado, 'El estado'));
  return findUsers({ q: String(query.q || '').trim(), rol, estado });
}

// HU-03 / HU-04: crear un usuario con rol; los vendedores se enlazan a un vendedor activo.
export async function registerUser(data = {}, actor) {
  const correo_acceso = requireEmail(data.correo_acceso, 'El correo de acceso');
  const password = requirePassword(data.password);
  const rol = requireOneOf(data.rol, 'El rol', USER_ROLES);
  let id_vendedor = null;
  if (rol === 'Vendedor') {
    id_vendedor = requireId(data.id_vendedor, 'El vendedor');
    if (!(await findActiveVendor(id_vendedor))) throw httpError(404, 'El vendedor no existe o está inactivo.');
  }
  const id = await createUser({ correo_acceso, password_hash: await hashPassword(password), rol, id_vendedor }, actor?.email);
  return { id_usuario: id, message: 'Usuario creado correctamente.' };
}

// HU-04: activar o desactivar un usuario (un administrador no puede desactivarse a sí mismo).
export async function changeUserStatus(data = {}, actor) {
  const id_usuario = requireId(data.id_usuario, 'El usuario');
  const estado = toBoolean(data.estado, 'El estado');
  if (!estado && id_usuario === actor?.id) throw httpError(400, 'No puedes desactivar tu propio usuario.');
  await updateUserStatus({ id_usuario, estado }, actor?.email);
  return { id_usuario, estado, message: estado ? 'Usuario activado.' : 'Usuario desactivado.' };
}