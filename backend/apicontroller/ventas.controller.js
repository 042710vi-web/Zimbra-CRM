import { changeSaleState, editSale, getSales, registerSale } from '../service/ventas.service.js';
// HU-29: lista ventas con filtros, paginación y detalle.
export async function list(req, res, next) { try { res.json(await getSales(req.query, req.user)); } catch (error) { next(error); } }
// HU-28: crea la venta y su detalle en una transacción.
export async function create(req, res, next) { try { const body = req.user?.role === 'Vendedor' ? { ...req.body, id_vendedor: req.user.vendorId } : req.body; res.status(201).json(await registerSale(body)); } catch (error) { next(error); } }
// HU-30: modifica una venta que continúa pendiente.
export async function update(req, res, next) { try { res.json(await editSale(req.body, req.user)); } catch (error) { next(error); } }
// HU-31: completa o cancela una venta pendiente.
export async function changeStatus(req, res, next) { try { res.json(await changeSaleState(req.body)); } catch (error) { next(error); } }
