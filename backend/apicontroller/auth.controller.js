import * as auth from '../service/auth.service.js';
// HU-01: iniciar sesión.
export async function login(req, res, next) {
  try { res.json(await auth.login(req.body)); } catch (error) { next(error); }
}

// HU-02: cerrar sesión.
export function logout(req, res, next) {
  try { res.json(auth.logout()); } catch (error) { next(error); }
}
