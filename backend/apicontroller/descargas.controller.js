import { registerTrial } from '../service/descargas.service.js';
export async function create(req, res, next) {
  try { res.status(201).json(await registerTrial(req.body)); } catch (error) { next(error); }
}
