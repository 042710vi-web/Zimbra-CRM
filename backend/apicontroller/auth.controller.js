import * as auth from '../service/auth.service.js';
export async function login(req, res, next) {
  try { res.json(await auth.login(req.body)); } catch (error) { next(error); }
}
