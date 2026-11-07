import * as clients from '../service/clientes.service.js';
export async function create(req, res, next) {
  try { res.status(201).json(await clients.registerClient(req.body)); } catch (error) { next(error); }
}
