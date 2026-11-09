/**
 * Describe los datos de actividad web que el sistema registra en la base de datos.
 */
import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

// Conserva cada acción del cliente en el sitio y el puntaje aplicado en ese momento.
export const ActividadWeb = sequelize.define('ActividadWeb', {
  id_actividad: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, field: 'id_actividad' },
  id_cliente: { type: DataTypes.INTEGER, allowNull: false, field: 'id_cliente' },
  id_accion: { type: DataTypes.INTEGER, allowNull: false, field: 'id_accion' },
  id_campana: { type: DataTypes.INTEGER, allowNull: true, field: 'id_campana' },
  fecha_actividad: { type: DataTypes.DATE, field: 'fecha_actividad' },
  puntaje_otorgado: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'puntaje_otorgado' },
  direccion_origen: { type: DataTypes.STRING(255), allowNull: true, field: 'direccion_origen' },
  detalle: { type: DataTypes.STRING(255), allowNull: true, field: 'detalle' },
}, { tableName: 'actividad_web' });