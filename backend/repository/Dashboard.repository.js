/**
 * Consulta y guarda en la base de datos la información de dashboard.
 */
import { QueryTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

// Reúne en una respuesta los indicadores que necesita el panel comercial.
export async function getDashboard({ id_vendedor }) {
  const replacements = { id_vendedor: id_vendedor || null };
  const ownerClause = id_vendedor ? 'AND a.id_vendedor = :id_vendedor' : '';
  const qualified = await sequelize.query(
    `SELECT DISTINCT c.id_cliente, c.nombre_completo, c.correo_electronico,
            c.puntaje_total, a.id_vendedor, v.nombre_vendedor
       FROM clientes c
       INNER JOIN asignaciones_crm a ON a.id_cliente = c.id_cliente AND a.estado = 'Activa'
       INNER JOIN vendedores v ON v.id_vendedor = a.id_vendedor
      WHERE c.estado_cliente = 'Calificado' ${ownerClause}
      ORDER BY c.puntaje_total DESC, c.id_cliente
      LIMIT 20`,
    { replacements, type: QueryTypes.SELECT },
  );
  const trials = await sequelize.query(
    `SELECT d.id_descarga, d.id_cliente, c.nombre_completo, d.id_producto,
            p.nombre_producto, d.fecha_fin,
            DATEDIFF(d.fecha_fin, CURRENT_DATE) AS dias_restantes,
            a.id_vendedor, v.nombre_vendedor
       FROM descargas_prueba d
       INNER JOIN clientes c ON c.id_cliente = d.id_cliente
       INNER JOIN productos p ON p.id_producto = d.id_producto
       INNER JOIN asignaciones_crm a ON a.id_cliente = c.id_cliente AND a.estado = 'Activa'
       INNER JOIN vendedores v ON v.id_vendedor = a.id_vendedor
      WHERE d.estado_prueba = 'Activa'
        AND d.fecha_fin BETWEEN CURRENT_DATE AND DATE_ADD(CURRENT_DATE, INTERVAL 7 DAY)
        ${ownerClause}
      ORDER BY d.fecha_fin, c.nombre_completo`,
    { replacements, type: QueryTypes.SELECT },
  );
  const [pendingSales] = await sequelize.query(
    `SELECT COUNT(*) AS cantidad, COALESCE(SUM(total_venta), 0) AS total_proyectado
       FROM ventas WHERE estado_venta = 'Pendiente'
       ${id_vendedor ? 'AND id_vendedor = :id_vendedor' : ''}`,
    { replacements, type: QueryTypes.SELECT },
  );
  const [assignments] = await sequelize.query(
    `SELECT COUNT(DISTINCT a.id_cliente) AS clientes_asignados
       FROM asignaciones_crm a
       INNER JOIN clientes c ON c.id_cliente = a.id_cliente
      WHERE a.estado = 'Activa' AND c.estado_cliente <> 'Inactivo' ${ownerClause}`,
    { replacements, type: QueryTypes.SELECT },
  );
  return {
    prospectos_calificados: qualified,
    pruebas_por_vencer: trials.map((trial) => ({ ...trial, dias_restantes: Number(trial.dias_restantes) })),
    ventas_pendientes: { cantidad: Number(pendingSales.cantidad), total_proyectado: Number(pendingSales.total_proyectado) },
    asignaciones_activas: Number(assignments.clientes_asignados),
  };
}