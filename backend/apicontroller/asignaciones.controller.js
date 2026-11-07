import { assignClient } from '../service/asignaciones.service.js';
export async function create(req, res, next) {
  try { res.status(201).json(await assignClient(req.body)); } catch (error) { next(error); }
}
