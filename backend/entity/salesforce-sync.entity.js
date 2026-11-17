import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const SalesforceSync = sequelize.define(
  'SalesforceSync',
  {
    id_sincronizacion: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
      field: 'id_sincronizacion',
    },
    id_cliente: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'id_cliente',
    },
    objeto_salesforce: {
      type: DataTypes.STRING(30),
      allowNull: false,
      field: 'objeto_salesforce',
    },
    estado: {
      type: DataTypes.STRING(20),
      allowNull: false,
      field: 'estado',
    },
    intentos: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'intentos',
    },
    salesforce_id: {
      type: DataTypes.STRING(30),
      allowNull: true,
      field: 'salesforce_id',
    },
    mensaje_error: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'mensaje_error',
    },
    fecha_creacion: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'fecha_creacion',
    },
    fecha_actualizacion: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'fecha_actualizacion',
    },
  },
  {
    tableName: 'salesforce_sincronizaciones',
    timestamps: false,
  },
);