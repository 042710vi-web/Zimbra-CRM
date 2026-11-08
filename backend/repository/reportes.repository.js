import { QueryTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

function addDateRange(where, replacements, fromColumn, toColumn, desde, hasta) {
  if (desde) { where.push(`${fromColumn} >= :desde`); replacements.desde = desde; }
  if (hasta) { where.push(`${toColumn} < DATE_ADD(:hasta, INTERVAL 1 DAY)`); replacements.hasta = hasta; }
}

export async function getSalesReport(filters) {
  const where = ['1 = 1'];
  const replacements = {};
  addDateRange(where, replacements, 'v.fecha_venta', 'v.fecha_venta', filters.desde, filters.hasta);
  if (filters.estado_venta) { where.push('v.estado_venta = :estado'); replacements.estado = filters.estado_venta; }
  if (filters.id_cliente) { where.push('v.id_cliente = :idCliente'); replacements.idCliente = filters.id_cliente; }
  if (filters.id_vendedor) { where.push('v.id_vendedor = :idVendedor'); replacements.idVendedor = filters.id_vendedor; }
  if (filters.id_producto) {
    where.push('EXISTS (SELECT 1 FROM detalle_ventas df WHERE df.id_venta = v.id_venta AND df.id_producto = :idProducto)');
    replacements.idProducto = filters.id_producto;
  }
  const clause = where.join(' AND ');
  const [summary] = await sequelize.query(
    `SELECT COUNT(*) AS cantidad_ventas,
            COALESCE(SUM(CASE WHEN v.estado_venta = 'Completada' THEN v.total_venta ELSE 0 END), 0) AS total_facturado,
            COALESCE(AVG(CASE WHEN v.estado_venta = 'Completada' THEN v.total_venta END), 0) AS ticket_promedio,
            COALESCE(SUM(CASE WHEN v.estado_venta = 'Pendiente' THEN 1 ELSE 0 END), 0) AS pendientes,
            COALESCE(SUM(CASE WHEN v.estado_venta = 'Completada' THEN 1 ELSE 0 END), 0) AS completadas,
            COALESCE(SUM(CASE WHEN v.estado_venta = 'Cancelada' THEN 1 ELSE 0 END), 0) AS canceladas
       FROM ventas v WHERE ${clause}`,
    { replacements, type: QueryTypes.SELECT },
  );
  const porVendedor = await sequelize.query(
    `SELECT vd.id_vendedor, vd.nombre_vendedor,
            COUNT(v.id_venta) AS cantidad_ventas,
            SUM(CASE WHEN v.estado_venta = 'Completada' THEN 1 ELSE 0 END) AS ventas_completadas,
            COALESCE(SUM(CASE WHEN v.estado_venta = 'Completada' THEN v.total_venta ELSE 0 END), 0) AS total_facturado
       FROM ventas v
       INNER JOIN vendedores vd ON vd.id_vendedor = v.id_vendedor
       INNER JOIN clientes c ON c.id_cliente = v.id_cliente
      WHERE ${clause}
      GROUP BY vd.id_vendedor, vd.nombre_vendedor
      ORDER BY total_facturado DESC, vd.nombre_vendedor`,
    { replacements, type: QueryTypes.SELECT },
  );
  return { resumen: summary, por_vendedor: porVendedor };
}

export async function getClientsReport({ desde, hasta }) {
  const where = ['1 = 1'];
  const replacements = {};
  addDateRange(where, replacements, 'c.fecha_registro', 'c.fecha_registro', desde, hasta);
  const [summary] = await sequelize.query(
    `SELECT COUNT(*) AS total_clientes FROM clientes c WHERE ${where.join(' AND ')}`,
    { replacements, type: QueryTypes.SELECT },
  );
  const rows = await sequelize.query(
    `SELECT c.estado_cliente, COUNT(*) AS cantidad,
            ROUND(COUNT(*) * 100 / NULLIF(:total, 0), 2) AS porcentaje
       FROM clientes c
      WHERE ${where.join(' AND ')}
      GROUP BY c.estado_cliente
      ORDER BY cantidad DESC, c.estado_cliente`,
    { replacements: { ...replacements, total: Number(summary.total_clientes) }, type: QueryTypes.SELECT },
  );
  return { total_clientes: Number(summary.total_clientes), por_estado: rows };
}

export async function getCampaignsReport({ desde, hasta }) {
  const where = ['1 = 1'];
  const replacements = {};
  if (desde) { where.push('(c.fecha_fin IS NULL OR c.fecha_fin >= :desde)'); replacements.desde = desde; }
  if (hasta) { where.push('(c.fecha_inicio IS NULL OR c.fecha_inicio < DATE_ADD(:hasta, INTERVAL 1 DAY))'); replacements.hasta = hasta; }
  const rows = await sequelize.query(
    `SELECT c.id_campana, c.nombre_campana, c.presupuesto, c.fecha_inicio, c.fecha_fin, c.estado,
            COUNT(DISTINCT aw.id_actividad) AS volumen_actividad,
            COUNT(DISTINCT CASE WHEN cl.estado_cliente = 'Calificado' THEN cl.id_cliente END) AS prospectos_calificados,
            CASE WHEN COUNT(DISTINCT CASE WHEN cl.estado_cliente = 'Calificado' THEN cl.id_cliente END) = 0
                 THEN 0
                 ELSE ROUND(COALESCE(c.presupuesto, 0) / COUNT(DISTINCT CASE WHEN cl.estado_cliente = 'Calificado' THEN cl.id_cliente END), 2)
            END AS costo_adquisicion
       FROM campanas_marketing c
       LEFT JOIN actividad_web aw ON aw.id_campana = c.id_campana
         AND (:desde IS NULL OR aw.fecha_actividad >= :desde)
         AND (:hasta IS NULL OR aw.fecha_actividad < DATE_ADD(:hasta, INTERVAL 1 DAY))
       LEFT JOIN clientes cl ON cl.id_cliente = aw.id_cliente
      WHERE ${where.join(' AND ')}
      GROUP BY c.id_campana, c.nombre_campana, c.presupuesto, c.fecha_inicio, c.fecha_fin, c.estado
      ORDER BY volumen_actividad DESC, c.nombre_campana`,
    { replacements: { desde: desde || null, hasta: hasta || null, ...replacements }, type: QueryTypes.SELECT },
  );
  return { campañas: rows };
}

export async function getInteractionsReport({ desde, hasta, id_vendedor, umbral_dias, page, limit }) {
  const replacements = { desde, hasta, umbral: umbral_dias, limit, offset: (page - 1) * limit };
  const vendorClause = id_vendedor ? 'AND a.id_vendedor = :idVendedor' : '';
  if (id_vendedor) replacements.idVendedor = id_vendedor;
  const porVendedor = await sequelize.query(
    `SELECT v.id_vendedor, v.nombre_vendedor, i.tipo_interaccion,
            COUNT(DISTINCT i.id_interaccion) AS cantidad_interacciones,
            COUNT(DISTINCT CASE WHEN s.estado_venta = 'Completada' THEN s.id_venta END) AS ventas_completadas
       FROM vendedores v
       LEFT JOIN asignaciones_crm a ON a.id_vendedor = v.id_vendedor
       LEFT JOIN interacciones i ON i.id_asignacion = a.id_asignacion
         AND i.fecha_interaccion >= :desde AND i.fecha_interaccion < DATE_ADD(:hasta, INTERVAL 1 DAY)
       LEFT JOIN ventas s ON s.id_vendedor = v.id_vendedor AND s.estado_venta = 'Completada'
         AND s.fecha_venta >= :desde AND s.fecha_venta < DATE_ADD(:hasta, INTERVAL 1 DAY)
      WHERE v.estado = 1 ${vendorClause}
      GROUP BY v.id_vendedor, v.nombre_vendedor, i.tipo_interaccion
      ORDER BY v.nombre_vendedor, i.tipo_interaccion`,
    { replacements, type: QueryTypes.SELECT },
  );
  const followupWhere = `cl.estado_cliente = 'Calificado'
        AND NOT EXISTS (
          SELECT 1 FROM interacciones i
          INNER JOIN asignaciones_crm ai ON ai.id_asignacion = i.id_asignacion
          WHERE ai.id_cliente = cl.id_cliente
            AND i.fecha_interaccion >= DATE_SUB(NOW(), INTERVAL :umbral DAY)
        )
        ${id_vendedor ? 'AND a.id_vendedor = :idVendedor' : ''}`;
  const [{ totalSeguimiento }] = await sequelize.query(
    `SELECT COUNT(DISTINCT cl.id_cliente) AS totalSeguimiento
       FROM clientes cl
       LEFT JOIN asignaciones_crm a ON a.id_cliente = cl.id_cliente AND a.estado = 'Activa'
      WHERE ${followupWhere}`,
    { replacements, type: QueryTypes.SELECT },
  );
  const sinSeguimiento = await sequelize.query(
    `SELECT cl.id_cliente, cl.nombre_completo, cl.puntaje_total, a.id_vendedor,
            v.nombre_vendedor,
            (SELECT MAX(i0.fecha_interaccion)
               FROM interacciones i0
               INNER JOIN asignaciones_crm a0 ON a0.id_asignacion = i0.id_asignacion
              WHERE a0.id_cliente = cl.id_cliente) AS ultima_interaccion
       FROM clientes cl
       LEFT JOIN asignaciones_crm a ON a.id_cliente = cl.id_cliente AND a.estado = 'Activa'
       LEFT JOIN vendedores v ON v.id_vendedor = a.id_vendedor
      WHERE ${followupWhere}
      ORDER BY cl.puntaje_total DESC, cl.id_cliente
      LIMIT :limit OFFSET :offset`,
    { replacements, type: QueryTypes.SELECT },
  );
  const asignaciones = await sequelize.query(
    `SELECT v.id_vendedor, v.nombre_vendedor,
            SUM(CASE WHEN a.estado = 'Activa' AND cl.estado_cliente <> 'Inactivo' THEN 1 ELSE 0 END) AS clientes_activos,
            AVG(CASE WHEN a.estado = 'Finalizada' AND a.fecha_fin IS NOT NULL
                     THEN TIMESTAMPDIFF(DAY, a.fecha_asignacion, a.fecha_fin) END) AS duracion_promedio_dias
       FROM vendedores v
       LEFT JOIN asignaciones_crm a ON a.id_vendedor = v.id_vendedor
       LEFT JOIN clientes cl ON cl.id_cliente = a.id_cliente
      WHERE v.estado = 1 ${vendorClause}
      GROUP BY v.id_vendedor, v.nombre_vendedor
      ORDER BY v.nombre_vendedor`,
    { replacements, type: QueryTypes.SELECT },
  );
  return { por_vendedor: porVendedor, calificados_sin_seguimiento: sinSeguimiento, total_seguimiento: Number(totalSeguimiento), asignaciones };
}
