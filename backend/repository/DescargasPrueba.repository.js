/**
 * Consulta y guarda en la base de datos la información de descargas prueba.
 */
import { QueryTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import { AccionMarketing } from '../entity/AccionesMarketing.entity.js';
import { Cliente } from '../entity/Clientes.entity.js';
import { DescargaPrueba } from '../entity/DescargasPrueba.entity.js';
import { Producto } from '../entity/Productos.entity.js';
import { recordActivityInTransaction } from './ActividadWeb.repository.js';
import { registerChanges } from './AuditoriaCambios.repository.js';

// Registra la prueba, su vencimiento y el puntaje de descarga.
export async function createTrial({ id_cliente, id_producto, usuario }) {
  const result = await sequelize.transaction(async (transaction) => {
    const client = await Cliente.findByPk(id_cliente, { transaction, lock: transaction.LOCK.UPDATE });
    if (!client) throw Object.assign(new Error('El cliente indicado no existe.'), { status: 404 });
    if (client.estado_cliente === 'Inactivo') throw Object.assign(new Error('No se puede registrar una prueba para un cliente inactivo.'), { status: 409 });

    const product = await Producto.findOne({
      where: { id_producto, estado: true, tipo_licencia: 'Prueba 60 dias' },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!product) throw Object.assign(new Error('El producto no existe, está inactivo o no es una licencia de prueba.'), { status: 400 });

    const activeTrials = await DescargaPrueba.findAll({
      where: { id_cliente, id_producto, estado_prueba: 'Activa' },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (activeTrials.length) {
      const [databaseDate] = await sequelize.query(
        "SELECT DATE_FORMAT(CURRENT_DATE, '%Y-%m-%d') AS hoy",
        { type: QueryTypes.SELECT, transaction },
      );
      const notExpired = [];
      for (const activeTrial of activeTrials) {
        if (String(activeTrial.fecha_fin) < databaseDate.hoy) {
          await activeTrial.update({ estado_prueba: 'Vencida' }, { transaction });
          await registerChanges({
            tabla: 'descargas_prueba', idRegistro: activeTrial.id_descarga, usuario, transaction,
            cambios: { estado_prueba: ['Activa', 'Vencida'] },
          });
        } else {
          notExpired.push(activeTrial);
        }
      }
      if (notExpired.length) {
        const earliestEndDate = notExpired.map((trial) => String(trial.fecha_fin)).sort()[0];
        return { conflicto: `El cliente ya tiene una prueba activa hasta ${earliestEndDate}.` };
      }
    }

    const action = await AccionMarketing.findOne({
      where: { nombre_accion: 'Descarga de prueba (60 días)', estado: true }, transaction,
    });
    if (!action) throw Object.assign(new Error('No está configurada la acción de puntaje para la descarga de prueba.'), { status: 409 });

    const trial = await DescargaPrueba.create({
      id_cliente,
      id_producto,
      fecha_inicio: sequelize.literal('CURRENT_DATE'),
      fecha_fin: sequelize.literal('DATE_ADD(CURRENT_DATE, INTERVAL 60 DAY)'),
      estado_prueba: 'Activa',
    }, { transaction });
    await registerChanges({
      tabla: 'descargas_prueba', idRegistro: trial.id_descarga, usuario: usuario || 'zimbra-api', transaction,
      cambios: { estado_prueba: [null, 'Activa'] },
    });
    const score = await recordActivityInTransaction({
      client,
      action,
      direccion_origen: null,
      detalle: `Descarga de prueba del producto ${product.nombre_producto}`,
      usuario,
      transaction,
    });
    return {
      id_descarga: trial.id_descarga,
      fecha_fin: trial.fecha_fin,
      id_actividad: score.id_actividad,
      puntos_agregados: score.puntos_agregados,
      puntaje_total: score.puntaje_total,
      estado_cliente: score.estado_cliente,
      alerta_calificacion: score.alerta_calificacion,
      message: 'Prueba registrada por 60 días.',
    };
  });
  if (result.conflicto) throw Object.assign(new Error(result.conflicto), { status: 409 });
  return result;
}

// Devuelve pruebas con filtros, días restantes y venta relacionada.
export async function listTrials({ estado_prueba, id_cliente, id_producto, vence_desde, vence_hasta, id_vendedor, page, limit, offset }) {
  const conditions = ['1 = 1'];
  const replacements = { estado_prueba: estado_prueba || null, id_cliente: id_cliente || null, id_producto: id_producto || null, vence_desde: vence_desde || null, vence_hasta: vence_hasta || null, id_vendedor: id_vendedor || null, limit, offset };
  if (estado_prueba) conditions.push('d.estado_prueba = :estado_prueba');
  if (id_cliente) conditions.push('d.id_cliente = :id_cliente');
  if (id_producto) conditions.push('d.id_producto = :id_producto');
  if (vence_desde) conditions.push('d.fecha_fin >= :vence_desde');
  if (vence_hasta) conditions.push('d.fecha_fin <= :vence_hasta');
  if (id_vendedor) conditions.push(`EXISTS (
    SELECT 1 FROM asignaciones_crm ax
     WHERE ax.id_cliente = d.id_cliente AND ax.id_vendedor = :id_vendedor AND ax.estado = 'Activa'
  )`);
  const where = conditions.join(' AND ');
  const [count] = await sequelize.query(
    `SELECT COUNT(*) AS total FROM descargas_prueba d WHERE ${where}`,
    { replacements, type: QueryTypes.SELECT },
  );
  const rows = await sequelize.query(
    `SELECT d.id_descarga, d.id_cliente, cl.nombre_completo,
            d.id_producto, p.nombre_producto, d.fecha_inicio, d.fecha_fin,
            GREATEST(DATEDIFF(d.fecha_fin, CURRENT_DATE), 0) AS dias_restantes,
            CASE WHEN d.estado_prueba = 'Activa'
                   AND d.fecha_fin BETWEEN CURRENT_DATE AND DATE_ADD(CURRENT_DATE, INTERVAL 7 DAY)
                 THEN TRUE ELSE FALSE END AS proxima_a_vencer,
            d.estado_prueba, d.id_venta, v.numero_contrato
       FROM descargas_prueba d
       INNER JOIN clientes cl ON cl.id_cliente = d.id_cliente
       INNER JOIN productos p ON p.id_producto = d.id_producto
       LEFT JOIN ventas v ON v.id_venta = d.id_venta
      WHERE ${where}
      ORDER BY (d.estado_prueba = 'Activa') DESC, d.fecha_fin, d.id_descarga
      LIMIT :limit OFFSET :offset`,
    { replacements, type: QueryTypes.SELECT },
  );
  return {
    data: rows.map((row) => ({ ...row, dias_restantes: Number(row.dias_restantes), proxima_a_vencer: Boolean(row.proxima_a_vencer) })),
    pagination: { page, limit, total: Number(count.total), pages: Math.ceil(Number(count.total) / limit) },
  };
}

// Marca como vencidas únicamente las pruebas activas cuya fecha caducó.
export async function expireTrials(usuario = 'sistema') {
  return sequelize.transaction(async (transaction) => {
    const dueTrials = await sequelize.query(
      `SELECT id_descarga FROM descargas_prueba
        WHERE estado_prueba = 'Activa' AND fecha_fin < CURRENT_DATE
        FOR UPDATE`,
      { type: QueryTypes.SELECT, transaction },
    );
    for (const row of dueTrials) {
      const trial = await DescargaPrueba.findByPk(row.id_descarga, { transaction });
      if (!trial || trial.estado_prueba !== 'Activa') continue;
      await trial.update({ estado_prueba: 'Vencida' }, { transaction });
      await registerChanges({
        tabla: 'descargas_prueba', idRegistro: trial.id_descarga, usuario, transaction,
        cambios: { estado_prueba: ['Activa', 'Vencida'] },
      });
    }
    return { vencidas: dueTrials.length };
  });
}