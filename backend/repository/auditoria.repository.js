import { AuditoriaCambio } from '../entity/auditoria-cambio.entity.js';

// HU-35 (auditoría/trazabilidad): guarda en auditoria_cambios cada campo que realmente cambió.
// `cambios` es { campo: [valorAnterior, valorNuevo] }; si no hay diferencia no se registra.
export async function registerChanges({ tabla, idRegistro, cambios, usuario, transaction }) {
  const rows = Object.entries(cambios)
    .filter(([, [anterior, nuevo]]) => String(anterior ?? '') !== String(nuevo ?? ''))
    .map(([campo, [anterior, nuevo]]) => ({
      tabla,
      id_registro: idRegistro,
      campo,
      valor_anterior: anterior === null || anterior === undefined ? null : String(anterior),
      valor_nuevo: nuevo === null || nuevo === undefined ? null : String(nuevo),
      usuario_bd: usuario || 'sistema',
      fecha_cambio: new Date(),
    }));
  if (rows.length) await AuditoriaCambio.bulkCreate(rows, { transaction });
}
