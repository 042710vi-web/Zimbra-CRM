/**
 * Valida los datos y coordina las operaciones necesarias para gestionar marketing-scoring.
 */
import { recalculateLeadScores as recalculate } from '../repository/ActividadWeb.repository.js';

// HU-21: Vuelve a calcular los puntajes desde el historial de actividades.
export async function recalculateLeadScores(user = {}) {
  return recalculate(user.email);
}