/** HU-15 y HU-16 - Actividad web.
 * Describe los campos que se guardan en la base de datos.
 */
import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

// Conserva cada acción del cliente en el sitio y el puntaje aplicado en ese momento.
export const ActividadWeb = sequelize.define('ActividadWeb', {
  id_actividad: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, field: 'id_actividad' },
  id_cliente: { type: DataTypes.INTEGER, allowNull: true, field: 'id_cliente' },
  clave_rastreo: { type: DataTypes.STRING(100), allowNull: true, field: 'clave_rastreo' },
  es_retorno: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'es_retorno' },
  id_accion: { type: DataTypes.INTEGER, allowNull: false, field: 'id_accion' },
  id_campana: { type: DataTypes.INTEGER, allowNull: true, field: 'id_campana' },
  fecha_actividad: { type: DataTypes.DATE, field: 'fecha_actividad' },
  puntaje_otorgado: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'puntaje_otorgado' },
  direccion_origen: { type: DataTypes.STRING(255), allowNull: true, field: 'direccion_origen' },
  detalle: { type: DataTypes.STRING(255), allowNull: true, field: 'detalle' },
}, { tableName: 'actividad_web' });

/** HU-04/HU-15: identidad del visitante compartida por el formulario y el rastreo. */
export const VisitanteWeb = sequelize.define('VisitanteWeb', {
  clave_rastreo: { type: DataTypes.STRING(100), primaryKey: true },
  id_cliente: { type: DataTypes.INTEGER, allowNull: true },
  fecha_creacion: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, { tableName: 'visitantes_web', timestamps: false });
