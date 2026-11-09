/**
 * Valida los datos y coordina las operaciones necesarias para gestionar campanas marketing.
 */
import {
  cambiarEstadoCampanaMarketing as guardarEstadoCampanaMarketing,
  crearCampanaMarketing as guardarCampanaMarketing,
  listarCampanasMarketing as consultarCampanasMarketing,
  actualizarCampanaMarketing as guardarCambiosCampanaMarketing,
} from '../repository/CampanasMarketing.repository.js';
import { httpError, pagination, requireId, requireOneOf, requireText } from '../utils/validators.js';

const ESTADOS_CAMPANA = ['Activa', 'Inactiva'];

/** Apoya la gestión de campanasmarketing mediante una tarea interna del sistema. */
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

/** Apoya la gestión de campanasmarketing mediante una tarea interna del sistema. */
function validarDatosCampana(data = {}) {
  const nombre_campana = requireText(data.nombre_campana, 'El nombre de la campaña', 150);
  const presupuesto = Number(data.presupuesto);
  if (!Number.isFinite(presupuesto) || presupuesto < 0) throw httpError(400, 'El presupuesto debe ser un número igual o mayor que cero.');
  const fecha_inicio = validarFecha(data.fecha_inicio, 'fecha_inicio');
  const fecha_fin = validarFecha(data.fecha_fin, 'fecha_fin');
  if (fecha_fin < fecha_inicio) throw httpError(400, 'La fecha de fin no puede ser anterior a la fecha de inicio.');
  const estado = data.estado === undefined ? 'Activa' : requireOneOf(data.estado, 'El estado', ESTADOS_CAMPANA);
  return {
    nombre_campana,
    descripcion: data.descripcion ? String(data.descripcion).trim() : null,
    presupuesto: Number(presupuesto.toFixed(2)),
    fecha_inicio,
    fecha_fin,
    estado,
  };
}

// HU-16/HU-17: consulta campañas con filtros de estado y fechas.
export async function listarCampanasMarketing(query = {}) {
  const estado = query.estado ? requireOneOf(query.estado, 'El estado', ESTADOS_CAMPANA) : undefined;
  const desde = query.desde ? validarFecha(query.desde, 'desde') : undefined;
  const hasta = query.hasta ? validarFecha(query.hasta, 'hasta') : undefined;
  if (desde && hasta && desde > hasta) throw httpError(400, 'desde no puede ser posterior a hasta.');
  return consultarCampanasMarketing({ estado, desde, hasta, ...pagination(query) });
}

// HU-16: registra una campaña activa y verifica sus fechas y presupuesto.
export async function crearCampanaMarketing(data = {}) {
  const campana = validarDatosCampana(data);
  const id_campana = await guardarCampanaMarketing(campana);
  return { id_campana, message: 'Campaña registrada correctamente.' };
}

// HU-17: modifica una campaña sin desvincular su actividad histórica.
export async function actualizarCampanaMarketing(data = {}, user = {}) {
  const id_campana = requireId(data.id_campana, 'La campaña');
  const campana = validarDatosCampana(data);
  await guardarCambiosCampanaMarketing({ id_campana, ...campana }, user.email);
  return { id_campana, message: 'Campaña actualizada correctamente.' };
}

// HU-18: activa o pausa una campaña sin eliminar sus métricas anteriores.
export async function cambiarEstadoCampanaMarketing(data = {}, user = {}) {
  const id_campana = requireId(data.id_campana, 'La campaña');
  const estado = requireOneOf(data.estado, 'El estado', ESTADOS_CAMPANA);
  const fecha_fin = data.fecha_fin ? validarFecha(data.fecha_fin, 'fecha_fin') : undefined;
  if (estado === 'Activa' && !fecha_fin) {
    const actual = await consultarCampanasMarketing({ id_campana, limit: 1, offset: 0, page: 1 });
    if (!actual.data.length) throw httpError(404, 'La campaña indicada no existe.');
    if (actual.data[0].fecha_fin < new Date().toISOString().slice(0, 10)) {
      throw httpError(409, 'La campaña ya finalizó; indique una nueva fecha_fin para activarla.');
    }
  }
  if (fecha_fin && fecha_fin < new Date().toISOString().slice(0, 10) && estado === 'Activa') {
    throw httpError(400, 'Una campaña activa debe tener una fecha_fin vigente.');
  }
  await guardarEstadoCampanaMarketing({ id_campana, estado, fecha_fin }, user.email);
  return { id_campana, estado, message: `Campaña ${estado === 'Activa' ? 'activada' : 'desactivada'} correctamente.` };
}