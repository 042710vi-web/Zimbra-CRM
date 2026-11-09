/**
 * Recibe las solicitudes de dashboard, las entrega al servicio correspondiente y comunica el resultado.
 */
import { getDashboard as readDashboard } from '../service/Dashboard.service.js';

// HU-34: Presenta prospectos, alertas de prueba, ventas y asignaciones.
export async function getDashboard(req, res, next) {
  try { res.json(await readDashboard(req.query, req.user)); } catch (error) { next(error); }
}