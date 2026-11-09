/**
 * Describe los datos de campanas marketing que el sistema registra en la base de datos.
 */
import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

// Representa la tabla campanas_marketing, donde se conservan las campañas del CRM.
export const CampanasMarketing = sequelize.define('campanas_marketing', {
  id_campana: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, field: 'id_campana' },
  nombre_campana: { type: DataTypes.STRING(150), allowNull: false, unique: true, field: 'nombre_campana' },
  descripcion: { type: DataTypes.TEXT, field: 'descripcion' },
  presupuesto: { type: DataTypes.DECIMAL(12, 2), field: 'presupuesto' },
  fecha_inicio: { type: DataTypes.DATEONLY, field: 'fecha_inicio' },
  fecha_fin: { type: DataTypes.DATEONLY, field: 'fecha_fin' },
  estado: { type: DataTypes.STRING(20), defaultValue: 'Activa', field: 'estado' },
}, { tableName: 'campanas_marketing', timestamps: false, freezeTableName: true });