/**
 * Describe los datos de asignaciones crm que el sistema registra en la base de datos.
 */
import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

/** Representa el registro de información correspondiente en la base de datos. */
export const Asignacion = sequelize.define('Asignacion', {
  id_asignacion: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, field: 'id_asignacion' },
  id_cliente: { type: DataTypes.INTEGER, allowNull: false, field: 'id_cliente' },
  id_vendedor: { type: DataTypes.INTEGER, allowNull: false, field: 'id_vendedor' },
  fecha_asignacion: { type: DataTypes.DATE, field: 'fecha_asignacion' },
  fecha_fin: { type: DataTypes.DATE, field: 'fecha_fin' },
  estado: { type: DataTypes.STRING(20), defaultValue: 'Activa', field: 'estado' },
}, { tableName: 'asignaciones_crm' });