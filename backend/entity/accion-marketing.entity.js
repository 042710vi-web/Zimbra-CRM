import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const AccionMarketing = sequelize.define('AccionMarketing', {
  id_accion: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, field: 'id_accion' },
  nombre_accion: { type: DataTypes.STRING(100), allowNull: false, unique: true, field: 'nombre_accion' },
  puntaje: { type: DataTypes.INTEGER, allowNull: false, field: 'puntaje' },
  estado: DataTypes.BOOLEAN,
}, { tableName: 'acciones_marketing' });
