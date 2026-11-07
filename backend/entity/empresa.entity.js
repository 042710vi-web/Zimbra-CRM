import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const Empresa = sequelize.define('Empresa', {
  id_empresa: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, field: 'id_empresa' },
  nombre_empresa: { type: DataTypes.STRING(150), allowNull: false, unique: true, field: 'nombre_empresa' },
  sector_industria: { type: DataTypes.STRING(100), field: 'sector_industria' },
  sitio_web: { type: DataTypes.STRING(150), field: 'sitio_web' },
}, { tableName: 'empresas' });
