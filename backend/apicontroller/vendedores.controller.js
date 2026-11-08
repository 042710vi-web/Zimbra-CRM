import { createVendor, getVendors } from '../service/vendedores.service.js';
// HU-04: lista vendedores para asignación y filtros.
export async function list(req, res, next) { try { res.json(await getVendors(req.query)); } catch (error) { next(error); } }
// HU-04: registra un vendedor en el catálogo de vendedores.
export async function create(req, res, next) { try { res.status(201).json(await createVendor(req.body)); } catch (error) { next(error); } }
