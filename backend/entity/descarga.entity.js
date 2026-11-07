import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const DescargaPrueba = sequelize.define('DescargaPrueba', {
  id_descarga: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, field: 'id_descarga' },
  id_cliente: { type: DataTypes.INTEGER, allowNull: false, field: 'id_cliente' },
  id_producto: { type: DataTypes.INTEGER, allowNull: false, field: 'id_producto' },
  fecha_inicio: { type: DataTypes.DATEONLY, field: 'fecha_inicio' },
  fecha_fin: { type: DataTypes.DATEONLY, allowNull: false, field: 'fecha_fin' },
  estado_prueba: { type: DataTypes.STRING(30), defaultValue: 'Activa', field: 'estado_prueba' },
}, { tableName: 'descargas_prueba' });
