import {
  createCompany,
  findCompanies,
  findCompanyDetail,
  updateCompany as saveCompany,
} from '../repository/empresas.repository.js';

import {
  optionalText,
  optionalUrl,
  requireId,
  requireText,
} from '../utils/validators.js';

// HU-09: listado para selectores y búsqueda.
export const listCompanies = (query = {}) => findCompanies(String(query.q || '').trim());

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

export async function updateCompany(data = {}, user) {
  const id_empresa = requireId(data.id_empresa, 'La empresa');

  const clean = {
    id_empresa,
    nombre_empresa: requireText(
      data.nombre_empresa,
      'El nombre de la empresa',
      150,
    ),
    sector_industria: optionalText(data.sector_industria, 'El sector', 100),
    sitio_web: optionalUrl(data.sitio_web),
  };

  await saveCompany(clean, user?.email);

  return {
    id_empresa,
    message: 'Empresa actualizada correctamente.',
  };
}