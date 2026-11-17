/**
 * Recibe las solicitudes de vendedores, las entrega al servicio correspondiente y comunica el resultado.
 */
import { changeVendorState, createVendor, getVendors, updateVendor } from '../service/vendedores.service.js';
// HU-20: lista vendedores para asignación y filtros.
export async function list(req, res, next) { try { res.json(await getVendors(req.query)); } catch (error) { next(error); } }
// HU-20: registra un vendedor en el catálogo de vendedores.
export async function create(req, res, next) { try { res.status(201).json(await createVendor(req.body)); } catch (error) { next(error); } }
// HU-20: actualiza los datos de contacto del vendedor.
export async function update(req, res, next) { try { res.json(await updateVendor(req.body)); } catch (error) { next(error); } }
// HU-20: activa o desactiva sin borrar físicamente.
export async function changeState(req, res, next) { try { res.json(await changeVendorState(req.body)); } catch (error) { next(error); } }
