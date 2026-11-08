import * as clients from '../service/clientes.service.js';

// HU-05: registrar un nuevo cliente.
export async function create(req, res, next) {
  try { res.status(201).json(await clients.registerClient(req.body)); } catch (error) { next(error); }
}
// HU-06: listar y buscar clientes con filtros y paginación.
export async function list(req, res, next) {
  try { res.json(await clients.listClients(req.query)); } catch (error) { next(error); }
}
// HU-07: actualizar datos de un cliente (el ID va en el body).
export async function update(req, res, next) {
  try { res.json(await clients.updateClient(req.body, req.user)); } catch (error) { next(error); }
}
// HU-08: cambiar el estado de un cliente.
export async function changeStatus(req, res, next) {
  try { res.json(await clients.changeClientStatus(req.body, req.user)); } catch (error) { next(error); }
}
