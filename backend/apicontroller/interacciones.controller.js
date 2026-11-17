/**
 * Recibe las solicitudes de interacciones, las entrega al servicio correspondiente y comunica el resultado.
 */
import { createInteraction, editInteraction, getInteractions, getTimeline } from '../service/interacciones.service.js';
// HU-25: consulta interacciones con filtros y paginación.
export async function list(req, res, next) { try { res.json(await getInteractions(req.query, req.user)); } catch (error) { next(error); } }
// HU-25: registra una llamada, correo, reunión o alerta.
export async function create(req, res, next) { try { res.status(201).json(await createInteraction(req.body, req.user)); } catch (error) { next(error); } }
export async function history(req, res, next) { try { res.json(await getTimeline(req.query, req.user)); } catch (error) { next(error); } }
export async function update(req, res, next) { try { res.json(await editInteraction(req.body, req.user)); } catch (error) { next(error); } }
