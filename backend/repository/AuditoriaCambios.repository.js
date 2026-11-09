/**
 * Consulta y guarda en la base de datos la información de auditoria cambios.
 */
import { AuditoriaCambio } from '../entity/AuditoriaCambios.entity.js';
import { AccionMarketing } from '../entity/AccionesMarketing.entity.js';
import { Asignacion } from '../entity/AsignacionesCrm.entity.js';
import { CampanasMarketing } from '../entity/CampanasMarketing.entity.js';
import { Cliente } from '../entity/Clientes.entity.js';
import { DescargaPrueba } from '../entity/DescargasPrueba.entity.js';
import { Producto } from '../entity/Productos.entity.js';
import { Usuario } from '../entity/Usuarios.entity.js';
import { Venta } from '../entity/Ventas.entity.js';

const AUDITABLES = {
  acciones_marketing: AccionMarketing,
  asignaciones_crm: Asignacion,
  campanas_marketing: CampanasMarketing,
  clientes: Cliente,
  descargas_prueba: DescargaPrueba,
  productos: Producto,
  usuarios: Usuario,
  ventas: Venta,
};

// HU-35: el sistema registra los campos modificados solo si la fila relacionada existe y la transacción está activa.
// `cambios` presenta cada campo con su valor anterior y su valor nuevo.
export async function registerChanges({ tabla, idRegistro, cambios, usuario, transaction }) {
  const model = Object.prototype.hasOwnProperty.call(AUDITABLES, tabla) ? AUDITABLES[tabla] : null;
  if (!model) throw Object.assign(new Error('La tabla indicada no está habilitada para auditoría.'), { status: 500 });
  const recordId = Number(idRegistro);
  if (!Number.isInteger(recordId) || recordId < 1) {
    throw Object.assign(new Error('El identificador del registro auditado no es válido.'), { status: 500 });
  }
  if (!transaction) throw Object.assign(new Error('El registro de auditoría debe compartir la transacción del cambio.'), { status: 500 });

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
  if (!rows.length) return;

  const record = await model.findByPk(recordId, { transaction });
  if (!record) throw Object.assign(new Error('No se encontró el registro relacionado con el cambio de auditoría.'), { status: 409 });
  await AuditoriaCambio.bulkCreate(rows, { transaction });
}