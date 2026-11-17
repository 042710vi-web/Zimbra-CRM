/**
 * Recibe las solicitudes de usuarios, las entrega al servicio correspondiente y comunica el resultado.
 */
import * as users from '../service/Usuarios.service.js';

// HU-03: listar usuarios del sistema.
export async function list(req, res, next) {
  try { res.json(await users.listUsers(req.query)); } catch (error) { next(error); }
}
// HU-03: crear un nuevo usuario de acceso.
export async function create(req, res, next) {
  try { res.status(201).json(await users.registerUser(req.body, req.user)); } catch (error) { next(error); }
}
// HU-03: activar o desactivar un usuario.
export async function changeStatus(req, res, next) {
  try { res.json(await users.changeUserStatus(req.body, req.user)); } catch (error) { next(error); }
}
