import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const Producto = sequelize.define('Producto', {
  id_producto: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, field: 'id_producto' },
  nombre_producto: { type: DataTypes.STRING(100), allowNull: false, field: 'nombre_producto' },
  tipo_licencia: { type: DataTypes.STRING(50), allowNull: false, field: 'tipo_licencia' },
  precio: DataTypes.DECIMAL(10, 2),
  estado: DataTypes.BOOLEAN,
}, { tableName: 'productos' });
