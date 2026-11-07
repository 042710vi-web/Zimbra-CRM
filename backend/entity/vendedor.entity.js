import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const Vendedor = sequelize.define('Vendedor', {
  id_vendedor: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, field: 'id_vendedor' },
  nombre_vendedor: { type: DataTypes.STRING(150), allowNull: false, field: 'nombre_vendedor' },
  correo_vendedor: { type: DataTypes.STRING(100), allowNull: false, unique: true, field: 'correo_vendedor' },
  estado: DataTypes.BOOLEAN,
}, { tableName: 'vendedores' });
