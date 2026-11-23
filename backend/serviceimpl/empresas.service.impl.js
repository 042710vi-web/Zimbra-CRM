import {
  createCompany,
  getCompanyDetails,
  findCompanies,
} from '../repository/empresas.repository.js';

import {
  optionalText,
  optionalUrl,
  requireId,
  requireText,
} from '../utils/validators.js';

// HU-09: listado para selectores y búsqueda.
export async function companyDetails(id) {
  const id_empresa = Number.parseInt(id, 10);
  if (!Number.isInteger(id_empresa) || id_empresa < 1) throw Object.assign(new Error('El identificador de empresa no es válido.'), { status: 400 });
  const detail = await getCompanyDetails(id_empresa);
  if (!detail) throw Object.assign(new Error('No existe la empresa indicada.'), { status: 404 });
  return detail;
}

export const listCompanies = (query = {}) => query.id_empresa
  ? companyDetails(query.id_empresa)
  : findCompanies(String(query.q || '').trim());

// HU-09: registrar una nueva empresa (el nombre es único).
export async function registerCompany(data = {}) {
  const id_empresa = await createCompany({
    nombre_empresa: requireText(
      data.nombre_empresa,
      'El nombre de la empresa',
      150,
    ),
    sector_industria: optionalText(data.sector_industria, 'El sector', 100),
    sitio_web: optionalUrl(data.sitio_web),
  });

  return {
    id_empresa,
    message: 'Empresa registrada correctamente.',
  };
}

