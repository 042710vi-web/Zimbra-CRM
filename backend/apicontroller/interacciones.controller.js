import { createInteraction, getInteractions } from '../service/interacciones.service.js';
// HU-27: consulta interacciones con filtros y paginación.
export async function list(req, res, next) { try { res.json(await getInteractions(req.query, req.user)); } catch (error) { next(error); } }
// HU-26: registra una llamada, correo, reunión o alerta.
export async function create(req, res, next) { try { res.status(201).json(await createInteraction(req.body, req.user)); } catch (error) { next(error); } }
