/**
 * Describe los datos de descargas prueba que el sistema registra en la base de datos.
 */
import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

// Representa la prueba de producto que un cliente puede evaluar durante 60 días.
export const DescargaPrueba = sequelize.define('DescargaPrueba', {
  id_descarga: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, field: 'id_descarga' },
  id_cliente: { type: DataTypes.INTEGER, allowNull: false, field: 'id_cliente' },
  id_producto: { type: DataTypes.INTEGER, allowNull: false, field: 'id_producto' },
  // Relaciona la prueba convertida con la venta que originó el contrato.
  id_venta: {type: DataTypes.INTEGER,
    allowNull: true,
    field: 'id_venta',
    references: { model: 'ventas', key: 'id_venta' },
  },
  fecha_inicio: { type: DataTypes.DATEONLY, field: 'fecha_inicio' },
  fecha_fin: { type: DataTypes.DATEONLY, allowNull: false, field: 'fecha_fin' },
  estado_prueba: { type: DataTypes.STRING(30), defaultValue: 'Activa', field: 'estado_prueba' },
}, { tableName: 'descargas_prueba' });