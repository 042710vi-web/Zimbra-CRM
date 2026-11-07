import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const Campaña = sequelize.define('Campaña', {
  id_campana: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, field: 'id_campana' },
  nombre_campana: { type: DataTypes.STRING(150), allowNull: false, unique: true, field: 'nombre_campana' },
  descripcion: DataTypes.TEXT,
  presupuesto: DataTypes.DECIMAL(12, 2),
  fecha_inicio: { type: DataTypes.DATEONLY, field: 'fecha_inicio' },
  fecha_fin: { type: DataTypes.DATEONLY, field: 'fecha_fin' },
  estado: { type: DataTypes.STRING(20), defaultValue: 'Activa' },
}, { tableName: 'campanas_marketing' });
