/**
 * Describe los datos de detalle ventas que el sistema registra en la base de datos.
 */
import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

/** Representa el registro de información correspondiente en la base de datos. */
export const DetalleVenta = sequelize.define('DetalleVenta', {
  id_detalle: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, field: 'id_detalle' },
  id_venta: { type: DataTypes.INTEGER, allowNull: false, field: 'id_venta' },
  id_producto: { type: DataTypes.INTEGER, allowNull: false, field: 'id_producto' },
  cantidad: { type: DataTypes.INTEGER, allowNull: false, field: 'cantidad' },
  precio_unitario: { type: DataTypes.DECIMAL(10, 2), allowNull: false, field: 'precio_unitario' },
  subtotal: { type: DataTypes.DECIMAL(12, 2), allowNull: false, field: 'subtotal' },
}, { tableName: 'detalle_ventas' });