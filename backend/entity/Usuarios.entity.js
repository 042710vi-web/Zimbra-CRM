/**
 * Describe los datos de usuarios que el sistema registra en la base de datos.
 */
import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

/** Representa el registro de información correspondiente en la base de datos. */
export const Usuario = sequelize.define('Usuario', {
  id_usuario: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, field: 'id_usuario' },
  id_vendedor: { type: DataTypes.INTEGER, allowNull: true, field: 'id_vendedor' },
  correo_acceso: { type: DataTypes.STRING(100), allowNull: false, unique: true, field: 'correo_acceso' },
  password_hash: { type: DataTypes.STRING(255), allowNull: false, field: 'password_hash' },
  rol: { type: DataTypes.STRING(20), allowNull: false, field: 'rol' },
  estado: DataTypes.BOOLEAN,
  fecha_creacion: { type: DataTypes.DATE, field: 'fecha_creacion' },
}, { tableName: 'usuarios' });