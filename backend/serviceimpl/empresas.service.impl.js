/**
 * Valida los datos y coordina las operaciones necesarias para gestionar empresas.
 */
import { createCompany, findCompanies } from '../repository/Empresas.repository.js';
import { optionalText, optionalUrl, requireText } from '../utils/validators.js';

// HU-09: listado para selectores y búsqueda.
export const listCompanies = (query = {}) => findCompanies(String(query.q || '').trim());

// HU-09: registrar una nueva empresa (el nombre es único).
export async function registerCompany(data = {}) {
  const id = await createCompany({
    nombre_empresa: requireText(data.nombre_empresa, 'El nombre de la empresa', 150),
    sector_industria: optionalText(data.sector_industria, 'El sector', 100),
    sitio_web: optionalUrl(data.sitio_web),
  });
  return { id_empresa: id, message: 'Empresa registrada correctamente.' };
}