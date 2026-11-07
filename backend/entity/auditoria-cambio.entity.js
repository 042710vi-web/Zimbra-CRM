import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const AuditoriaCambio = sequelize.define('AuditoriaCambio', {
  id_auditoria: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true, field: 'id_auditoria' },
  tabla: { type: DataTypes.STRING(50), allowNull: false, field: 'tabla' },
  id_registro: { type: DataTypes.INTEGER, allowNull: false, field: 'id_registro' },
  campo: { type: DataTypes.STRING(50), field: 'campo' },
  valor_anterior: DataTypes.TEXT,
  valor_nuevo: DataTypes.TEXT,
  usuario_bd: { type: DataTypes.STRING(100), field: 'usuario_bd' },
  fecha_cambio: { type: DataTypes.DATE, field: 'fecha_cambio' },
}, { tableName: 'auditoria_cambios' });
