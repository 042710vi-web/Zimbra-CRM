/**
 * Recibe las solicitudes de asignaciones crm, las entrega al servicio correspondiente y comunica el resultado.
 */
import { assignBatch, assignClient, finish, getAssignments, reassign, takeProspect } from '../service/AsignacionesCrm.service.js';
// HU-22: consulta asignaciones con filtros y paginación.
export async function list(req, res, next) { try { res.json(await getAssignments(req.query, req.user)); } catch (error) { next(error); } }
// HU-21: asigna un cliente a un vendedor.
export async function create(req, res, next) { try { res.status(201).json(await assignClient(req.body, req.user)); } catch (error) { next(error); } }
// HU-21: asigna un lote completo bajo una única transacción.
export async function batch(req, res, next) { try { res.status(201).json(await assignBatch(req.body, req.user)); } catch (error) { next(error); } }
// HU-21: el vendedor autenticado toma un prospecto calificado sin responsable.
export async function take(req, res, next) { try { res.status(201).json(await takeProspect(req.body, req.user)); } catch (error) { next(error); } }
// HU-22: finaliza la asignación actual y conserva el historial.
export async function changeAssignee(req, res, next) { try { res.json(await reassign(req.body, req.user)); } catch (error) { next(error); } }
// HU-22: finaliza una asignación sin eliminar su historial.
export async function close(req, res, next) { try { res.json(await finish(req.body, req.user)); } catch (error) { next(error); } }
