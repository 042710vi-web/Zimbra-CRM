import { QueryTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import { AuditoriaCambio } from '../entity/AuditoriaCambios.entity.js';
import { callProcedure } from './storedProcedures.repository.js';

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
  const tabla = query.tabla ? String(query.tabla).slice(0, 50) : null;
  const desde = query.desde ? new Date(query.desde) : null;
  const hasta = query.hasta ? new Date(query.hasta) : null;
  if ((desde && Number.isNaN(desde.getTime())) || (hasta && Number.isNaN(hasta.getTime()))) {
    throw Object.assign(new Error('El rango de fechas no es válido.'), { status: 400 });
  }
  const params = { tabla, desde, hasta };
  const [rows] = await callProcedure('sp_consultar_auditoria', [
    params.tabla, desde, hasta, limit, (page - 1) * limit,
  ]);
  const [countRow] = await sequelize.query(
    `SELECT COUNT(*) AS total FROM auditoria_cambios
      WHERE (:tabla IS NULL OR :tabla = '' OR tabla = :tabla)
        AND (:desde IS NULL OR fecha_cambio >= :desde)
        AND (:hasta IS NULL OR fecha_cambio <= :hasta)`,
    { replacements: params, type: QueryTypes.SELECT },
  );
  return { count: Number(countRow.total), rows };
}
