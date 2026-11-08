import * as companies from '../service/empresas.service.js';

// HU-09: listar empresas para selectores y búsqueda.
export async function list(req, res, next) {
  try { res.json(await companies.listCompanies(req.query)); } catch (error) { next(error); }
}
// HU-09: registrar una nueva empresa.
export async function create(req, res, next) {
  try { res.status(201).json(await companies.registerCompany(req.body)); } catch (error) { next(error); }
}
