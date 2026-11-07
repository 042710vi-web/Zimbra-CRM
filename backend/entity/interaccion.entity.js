import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const Interaccion = sequelize.define('Interaccion', {
  id_interaccion: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, field: 'id_interaccion' },
  id_asignacion: { type: DataTypes.INTEGER, allowNull: false, field: 'id_asignacion' },
  tipo_interaccion: { type: DataTypes.STRING(40), allowNull: false, field: 'tipo_interaccion' },
  resultado: { type: DataTypes.STRING(60), field: 'resultado' },
  fecha_interaccion: { type: DataTypes.DATE, field: 'fecha_interaccion' },
  notas: DataTypes.TEXT,
}, { tableName: 'interacciones' });
