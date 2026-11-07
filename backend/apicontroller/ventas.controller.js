import { registerSale } from '../service/ventas.service.js';
export async function create(req, res, next) {
  try {
    const body = req.user?.role === 'Vendedor'
      ? { ...req.body, id_vendedor: req.user.vendorId }
      : req.body;
    res.status(201).json(await registerSale(body));
  } catch (error) { next(error); }
}
