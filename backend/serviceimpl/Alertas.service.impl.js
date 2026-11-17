/** HU-17 - Alertas.
 * Revisa los datos y coordina las operaciones del módulo.
 */
import { listAlerts, attendAlert } from '../repository/Alertas.repository.js';
import { httpError, optionalId, optionalText, pagination, requireId, requireOneOf } from '../utils/validators.js';
const TYPES = ['Prospecto calificado', 'Retorno al sitio', 'Prueba por vencer', 'Prueba vencida'];
function sellerScope(user) {
  if (!['Administrador', 'Vendedor'].includes(user.role)) throw httpError(403, 'Rol sin acceso a alertas.');
  if (user.role !== 'Vendedor') return undefined;
  if (!user.vendorId) throw httpError(403, 'La cuenta no está vinculada a un vendedor.');
  return requireId(user.vendorId, 'El vendedor');
}
export async function getAlerts(query = {}, user = {}) {
  const own = sellerScope(user);
  const requested = optionalId(query.id_vendedor, 'id_vendedor');
  if (own !== undefined && requested !== null && requested !== own) throw httpError(403, 'No puedes consultar alertas de otro vendedor.');
  return listAlerts({
    id_vendedor: own ?? requested ?? undefined,
    estado_alerta: query.estado_alerta ? requireOneOf(query.estado_alerta, 'estado_alerta', ['Pendiente', 'Atendida']) : undefined,
    tipo_alerta: query.tipo_alerta ? requireOneOf(query.tipo_alerta, 'tipo_alerta', TYPES) : undefined,
    ...pagination(query),
  });
}
export async function markAlertAttended(data = {}, user = {}) {
  const id_vendedor = sellerScope(user);
  return attendAlert({
    id_alerta: requireId(data.id_alerta, 'id_alerta'),
    nota_atencion: optionalText(data.nota_atencion, 'nota_atencion', 500),
    id_usuario: requireId(user.id_usuario ?? user.id, 'El usuario'), id_vendedor, usuario: user.email,
  });
}
