/**
 * Recibe las solicitudes de auth, las entrega al servicio correspondiente y comunica el resultado.
 */
import * as auth from '../service/Auth.service.js';
// HU-01: iniciar sesión.
export async function login(req, res, next) {
  try { res.json(await auth.login(req.body)); } catch (error) { next(error); }
}

// HU-01: cerrar sesión.
export function logout(req, res, next) {
  try { res.json(auth.logout()); } catch (error) { next(error); }
}

// Recuperación de contraseña: flujo existente fuera de las 33 historias actualizadas.
export async function requestReset(req, res, next) {
  try { res.json(await auth.requestPasswordReset(req.body)); } catch (error) { next(error); }
}

// Recuperación de contraseña: flujo existente fuera de las 33 historias actualizadas.
export async function resetPassword(req, res, next) {
  try { res.json(await auth.resetPassword(req.body)); } catch (error) { next(error); }
}
