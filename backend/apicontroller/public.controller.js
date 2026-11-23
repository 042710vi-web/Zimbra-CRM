import { listMarketingActions } from '../service/AccionesMarketing.service.js';
import { listarCampanasMarketing } from '../service/CampanasMarketing.service.js';
import { createActivity } from '../service/ActividadWeb.service.js';
import { listProducts } from '../service/productos.service.js';

export async function catalog(req, res, next) {
  try {
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date());
    const [products, actions, campaigns] = await Promise.all([
      listProducts({ estado: true, page: 1, limit: 100 }),
      listMarketingActions({ estado: true, page: 1, limit: 100 }),
      listarCampanasMarketing({ estado: 'Activa', desde: today, hasta: today, page: 1, limit: 100 }),
    ]);
    res.json({
      products: products.data
        .filter((product) => ['Gratuita', 'Prueba 60 dias', 'Comercial'].includes(product.tipo_licencia))
        .map(({ id_producto, nombre_producto, tipo_licencia, precio }) => ({ id_producto, nombre_producto, tipo_licencia, precio })),
      actions: actions.data.map(({ id_accion, nombre_accion }) => ({ id_accion, nombre_accion })),
      campaigns: campaigns.data.map(({ id_campana, nombre_campana, descripcion, fecha_inicio, fecha_fin }) => ({ id_campana, nombre_campana, descripcion, fecha_inicio, fecha_fin })),
    });
  } catch (error) { next(error); }
}

export async function activity(req, res, next) {
  try {
    const result = await createActivity(req.body, { email: 'sitio público' });
    res.status(201).json(result);
  } catch (error) { next(error); }
}
