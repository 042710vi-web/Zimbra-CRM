/**
 * Describe los datos de interacciones que el sistema registra en la base de datos.
 */
import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import { Asignacion } from './AsignacionesCrm.entity.js';

/** Representa el registro de información correspondiente en la base de datos. */
export const Interaccion = sequelize.define('Interaccion', {
  id_interaccion: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, field: 'id_interaccion' },
  id_asignacion: { type: DataTypes.INTEGER, allowNull: false, field: 'id_asignacion' },
  tipo_interaccion: { type: DataTypes.STRING(40), allowNull: false, field: 'tipo_interaccion' },
  resultado: { type: DataTypes.STRING(60), field: 'resultado' },
  fecha_interaccion: { type: DataTypes.DATE, field: 'fecha_interaccion' },
  notas: DataTypes.TEXT,
}, { tableName: 'interacciones' });

// HU-26/HU-27: permite consultar las interacciones con su asignación comercial.
Asignacion.hasMany(Interaccion, { foreignKey: 'id_asignacion', as: 'interacciones' });
Interaccion.belongsTo(Asignacion, { foreignKey: 'id_asignacion', as: 'asignacion' });