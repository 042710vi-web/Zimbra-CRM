/**
 * Describe los datos de productos que el sistema registra en la base de datos.
 */
import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

// Representa cada licencia del catálogo comercial de Zimbra.
export const Producto = sequelize.define('Producto', {
  id_producto: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, field: 'id_producto' },
  nombre_producto: { type: DataTypes.STRING(100), allowNull: false, field: 'nombre_producto' },
  tipo_licencia: { type: DataTypes.STRING(50), allowNull: false, field: 'tipo_licencia' },
  precio: { type: DataTypes.DECIMAL(10, 2), allowNull: false, field: 'precio' },
  estado: { type: DataTypes.BOOLEAN, defaultValue: true, field: 'estado' },
  fecha_creacion: { type: DataTypes.DATE, field: 'fecha_creacion' },
}, { tableName: 'productos' });