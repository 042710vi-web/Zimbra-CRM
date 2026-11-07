import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const Cliente = sequelize.define('Cliente', {
  id_cliente: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, field: 'id_cliente' },
  id_empresa: { type: DataTypes.INTEGER, allowNull: true, field: 'id_empresa' },
  nombre_completo: { type: DataTypes.STRING(150), allowNull: false, field: 'nombre_completo' },
  correo_electronico: { type: DataTypes.STRING(100), allowNull: false, unique: true, field: 'correo_electronico' },
  telefono: { type: DataTypes.STRING(50), field: 'telefono' },
  fecha_registro: { type: DataTypes.DATE, field: 'fecha_registro' },
  puntaje_total: { type: DataTypes.INTEGER, field: 'puntaje_total' },
  estado_cliente: { type: DataTypes.STRING(50), defaultValue: 'Frio', field: 'estado_cliente' },
}, { tableName: 'clientes' });
