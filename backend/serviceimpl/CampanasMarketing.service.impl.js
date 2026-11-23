/** HU-12 y HU-13 - Campañas.
 * Revisa los datos y coordina las operaciones del módulo.
 */
import {
  cambiarEstadoCampanaMarketing as guardarEstadoCampanaMarketing,
  crearCampanaMarketing as guardarCampanaMarketing,
  listarCampanasMarketing as consultarCampanasMarketing,
  actualizarCampanaMarketing as guardarCambiosCampanaMarketing,
} from '../repository/CampanasMarketing.repository.js';
import { httpError, optionalText, pagination, requireId, requireOneOf, requireText } from '../utils/validators.js';

const ESTADOS_CAMPANA = ['Activa', 'Inactiva'];

/** Comprueba que la fecha exista y tenga el formato año-mes-día. */
function validarFecha(value, label) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw httpError(400, `${label} debe tener formato AAAA-MM-DD.`);
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== value) {
    throw httpError(400, `${label} no es una fecha válida.`);
  }
  return value;
}

/** Revisa el nombre, código, presupuesto y fechas de la campaña antes de guardarla. */
function validarDatosCampana(data = {}) {
  const nombre_campana = requireText(data.nombre_campana, 'El nombre de la campaña', 150);
  const codigo_campana = optionalText(data.codigo_campana ?? data.codigo, 'El código de campaña', 50)?.toUpperCase() ?? null;
  if (codigo_campana && !/^[A-Z0-9_-]+$/.test(codigo_campana)) throw httpError(400, 'El código de campaña solo admite letras, números, guion y guion bajo.');
  if (!['number', 'string'].includes(typeof data.presupuesto) || String(data.presupuesto).trim() === '') throw httpError(400, 'El presupuesto debe ser numérico.');
  const presupuesto = Number(data.presupuesto);
  if (presupuesto !== null && (!Number.isFinite(presupuesto) || presupuesto < 0)) throw httpError(400, 'El presupuesto debe ser un número igual o mayor que cero.');
  if (presupuesto !== null && presupuesto > 9999999999.99) throw httpError(400, 'El presupuesto supera el máximo permitido.');
  const fecha_inicio = validarFecha(data.fecha_inicio, 'fecha_inicio');
  const fecha_fin = validarFecha(data.fecha_fin, 'fecha_fin');
  if (fecha_fin < fecha_inicio) throw httpError(400, 'La fecha de fin no puede ser anterior a la fecha de inicio.');
  const estado = data.estado === undefined ? 'Activa' : requireOneOf(data.estado, 'El estado', ESTADOS_CAMPANA);
  return {
    nombre_campana,
    codigo_campana,
    descripcion: data.descripcion ? String(data.descripcion).trim() : null,
    presupuesto: presupuesto === null ? null : Number(presupuesto.toFixed(2)),
    fecha_inicio,
    fecha_fin,
    estado,
  };
}

// HU-13: consulta campañas con filtros de estado y fechas.
export async function listarCampanasMarketing(query = {}) {
  const estado = query.estado ? requireOneOf(query.estado, 'El estado', ESTADOS_CAMPANA) : undefined;
  const desde = query.desde ? validarFecha(query.desde, 'desde') : undefined;
  const hasta = query.hasta ? validarFecha(query.hasta, 'hasta') : undefined;
  if (desde && hasta && desde > hasta) throw httpError(400, 'desde no puede ser posterior a hasta.');
  return consultarCampanasMarketing({ estado, desde, hasta, ...pagination(query) });
}

// HU-12: registra una campaña activa y verifica sus fechas y presupuesto.
export async function crearCampanaMarketing(data = {}, user = {}) {
  const campana = validarDatosCampana({ ...data, estado: 'Activa' });
  const id_campana = await guardarCampanaMarketing(campana, user.email);
  return { id_campana, message: 'Campaña registrada correctamente.' };
}

// HU-13: modifica una campaña sin desvincular su actividad histórica.
export async function actualizarCampanaMarketing(data = {}, user = {}) {
  const id_campana = requireId(data.id_campana, 'La campaña');
  const campana = validarDatosCampana(data);
  await guardarCambiosCampanaMarketing({ id_campana, ...campana }, user.email);
  return { id_campana, message: 'Campaña actualizada correctamente.' };
}

// HU-13: activa o pausa una campaña sin eliminar sus métricas anteriores.
export async function cambiarEstadoCampanaMarketing(data = {}, user = {}) {
  const id_campana = requireId(data.id_campana, 'La campaña');
  const estado = requireOneOf(data.estado, 'El estado', ESTADOS_CAMPANA);
  const fecha_fin = data.fecha_fin ? validarFecha(data.fecha_fin, 'fecha_fin') : undefined;
  await guardarEstadoCampanaMarketing({ id_campana, estado, fecha_fin }, user.email);
  return { id_campana, estado, message: `Campaña ${estado === 'Activa' ? 'activada' : 'desactivada'} correctamente.` };
}
