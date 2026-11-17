/**
 * Describe los datos de ventas que el sistema registra en la base de datos.
 */
import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

/** Representa el registro de información correspondiente en la base de datos. */
export const Venta = sequelize.define('Venta', {
  id_venta: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, field: 'id_venta' },
  numero_contrato: { type: DataTypes.STRING(100), unique: true, field: 'numero_contrato' },
  id_cliente: { type: DataTypes.INTEGER, allowNull: false, field: 'id_cliente' },
  id_vendedor: { type: DataTypes.INTEGER, allowNull: false, field: 'id_vendedor' },
  fecha_venta: { type: DataTypes.DATE, field: 'fecha_venta' },
  estado_venta: { type: DataTypes.STRING(30), defaultValue: 'Pendiente', field: 'estado_venta' },
  metodo_pago: { type: DataTypes.STRING(50), field: 'metodo_pago' },
  total_venta: DataTypes.DECIMAL(12, 2),
}, { tableName: 'ventas' });