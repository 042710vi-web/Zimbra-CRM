/** HU-17 - Alertas.
 * Describe los campos que se guardan en la base de datos.
 */
import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
export const Alerta = sequelize.define('Alerta', {
  id_alerta: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
  id_cliente: { type: DataTypes.INTEGER, allowNull: false },
  id_vendedor: { type: DataTypes.INTEGER, allowNull: true },
  id_descarga: { type: DataTypes.INTEGER, allowNull: true },
  tipo_alerta: { type: DataTypes.STRING(40), allowNull: false },
  mensaje: { type: DataTypes.STRING(255), allowNull: false },
  clave_evento: { type: DataTypes.STRING(120), unique: true, allowNull: true },
  estado_alerta: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'Pendiente' },
  fecha_creacion: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  fecha_atencion: { type: DataTypes.DATE, allowNull: true },
  id_usuario_atendio: { type: DataTypes.INTEGER, allowNull: true },
  nota_atencion: { type: DataTypes.STRING(500), allowNull: true },
}, { tableName: 'alertas', timestamps: false });
