/**
 * Describe los datos de recuperacion claves que el sistema registra en la base de datos.
 */
import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

// Tokens temporales para recuperar la contraseña (HU-01). Solo se guarda el hash del token.
export const RecuperacionClave = sequelize.define('RecuperacionClave', {
  id_recuperacion: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true, field: 'id_recuperacion' },
  id_usuario: { type: DataTypes.INTEGER, allowNull: false, field: 'id_usuario' },
  token_hash: { type: DataTypes.CHAR(64), allowNull: false, field: 'token_hash' },
  creado_en: { type: DataTypes.DATE, field: 'creado_en' },
  expira_en: { type: DataTypes.DATE, allowNull: false, field: 'expira_en' },
  usado_en: { type: DataTypes.DATE, allowNull: true, field: 'usado_en' },
}, { tableName: 'recuperacion_claves' });