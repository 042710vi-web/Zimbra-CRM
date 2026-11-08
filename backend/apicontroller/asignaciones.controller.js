import { assignClient, finish, getAssignments, reassign } from '../service/asignaciones.service.js';
// HU-24: consulta asignaciones con filtros y paginación.
export async function list(req, res, next) { try { res.json(await getAssignments(req.query, req.user)); } catch (error) { next(error); } }
// HU-23: asigna un cliente a un vendedor.
export async function create(req, res, next) { try { res.status(201).json(await assignClient(req.body)); } catch (error) { next(error); } }
// HU-25: finaliza la asignación actual y conserva el historial.
export async function changeAssignee(req, res, next) { try { res.json(await reassign(req.body)); } catch (error) { next(error); } }
// HU-25: finaliza una asignación sin eliminar su historial.
export async function close(req, res, next) { try { res.json(await finish(req.body)); } catch (error) { next(error); } }
