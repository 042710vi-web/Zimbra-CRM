import { Op } from 'sequelize';
import { AuditoriaCambio } from '../entity/AuditoriaCambios.entity.js';

export async function registerChanges({
  tabla,
  idRegistro,
  cambios,
  usuario,
  transaction,
}) {
  const rows = Object.entries(cambios)
    .filter(([, [anterior, nuevo]]) =>
      String(anterior ?? '') !== String(nuevo ?? ''),
    )
    .map(([campo, [anterior, nuevo]]) => ({
      tabla,
      id_registro: idRegistro,
      campo,
      valor_anterior:
        anterior === null || anterior === undefined ? null : String(anterior),
      valor_nuevo:
        nuevo === null || nuevo === undefined ? null : String(nuevo),
      usuario_bd: usuario || 'sistema',
      fecha_cambio: new Date(),
    }));

  if (rows.length) {
    await AuditoriaCambio.bulkCreate(rows, { transaction });
  }
}

export async function listAudit(query = {}) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(query.limit, 10) || 20));
  const where = {};

  if (query.tabla) where.tabla = String(query.tabla).slice(0, 50);

  if (query.desde || query.hasta) {
    where.fecha_cambio = {};
    if (query.desde) where.fecha_cambio[Op.gte] = new Date(query.desde);
    if (query.hasta) where.fecha_cambio[Op.lte] = new Date(query.hasta);

    if (Number.isNaN(where.fecha_cambio[Op.gte]?.getTime?.()) ||
        Number.isNaN(where.fecha_cambio[Op.lte]?.getTime?.())) {
      throw Object.assign(new Error('El rango de fechas no es válido.'), {
        status: 400,
      });
    }
  }

  return AuditoriaCambio.findAndCountAll({
    where,
    order: [['fecha_cambio', 'DESC']],
    limit,
    offset: (page - 1) * limit,
  });
}
