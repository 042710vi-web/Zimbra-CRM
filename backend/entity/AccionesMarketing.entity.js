/**
 * Describe los datos de acciones marketing que el sistema registra en la base de datos.
 */
import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

// Representa una acción medible del visitante y el puntaje que aporta.
export const AccionMarketing = sequelize.define('AccionMarketing', {
  id_accion: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, field: 'id_accion' },
  nombre_accion: { type: DataTypes.STRING(100), allowNull: false, unique: true, field: 'nombre_accion' },
  puntaje: { type: DataTypes.INTEGER, allowNull: false, field: 'puntaje' },
  estado: { type: DataTypes.BOOLEAN, defaultValue: true, field: 'estado' },
}, { tableName: 'acciones_marketing' });