import { QueryTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import { callProcedure } from './storedProcedures.repository.js';

// Las funciones históricas no aceptan fechas: se presentan separadas del periodo.
export async function getIndicatorsReport({ desde, hasta, page, limit }) {
  const replacements = { desde, hasta, limit, offset: (page - 1) * limit };
  const select = (sql) => sequelize.query(sql, { replacements, type: QueryTypes.SELECT });
  const sets = await callProcedure('sp_reporte_rendimiento_vendedores', [desde, hasta]);
  const [resumen] = await select(`SELECT fn_ticket_promedio_ventas(:desde, :hasta) AS ticket_promedio_periodo`);
  const ventas = await select(`SELECT * FROM vw_reporte_ventas
    WHERE fecha_venta >= :desde AND fecha_venta < DATE_ADD(:hasta, INTERVAL 1 DAY)
    ORDER BY fecha_venta DESC, id_venta DESC LIMIT :limit OFFSET :offset`);
  const vendedores = await select(`SELECT r.*,
    fn_total_ventas_vendedor(r.id_vendedor) AS total_ventas_historico,
    fn_valor_proyectado_vendedor(r.id_vendedor) AS valor_proyectado_actual,
    fn_asignaciones_activas_vendedor(r.id_vendedor) AS asignaciones_activas_actuales
    FROM vw_reporte_rendimiento_vendedores r ORDER BY r.id_vendedor
    LIMIT :limit OFFSET :offset`);
  const clientes = await select(`SELECT c.id_cliente, c.nombre_completo,
    NULLIF(fn_obtener_vendedor_responsable(c.id_cliente), -1) AS id_vendedor_responsable,
    fn_contar_ventas_pendientes_cliente(c.id_cliente) AS ventas_pendientes_actuales,
    fn_contar_interacciones_recientes(c.id_cliente, 7) AS interacciones_ultimos_7_dias
    FROM clientes c ORDER BY c.id_cliente LIMIT :limit OFFSET :offset`);
  const productos = await select(`SELECT id_producto, nombre_producto, tipo_licencia,
    fn_es_producto_vendible(id_producto) AS es_vendible
    FROM productos ORDER BY id_producto LIMIT :limit OFFSET :offset`);
  const interacciones = await select(`SELECT * FROM vw_reporte_interacciones
    ORDER BY id_vendedor LIMIT :limit OFFSET :offset`);
  // La función mide el evento completo; la vista también desglosa por plantilla.
  const correos = await select(`SELECT r.*,
    fn_tasa_exito_correos(r.evento) AS tasa_exito_evento_historica
    FROM vw_reporte_automatizacion r ORDER BY r.evento, r.nombre_plantilla
    LIMIT :limit OFFSET :offset`);
  const [counts] = await select(`SELECT
    (SELECT COUNT(*) FROM vw_reporte_ventas WHERE fecha_venta >= :desde AND fecha_venta < DATE_ADD(:hasta, INTERVAL 1 DAY)) AS ventas,
    (SELECT COUNT(*) FROM vw_reporte_rendimiento_vendedores) AS vendedores,
    (SELECT COUNT(*) FROM clientes) AS clientes,
    (SELECT COUNT(*) FROM productos) AS productos,
    (SELECT COUNT(*) FROM vw_reporte_interacciones) AS interacciones,
    (SELECT COUNT(*) FROM vw_reporte_automatizacion) AS correos`);
  const total = Math.max(...Object.values(counts).map(Number), 0);
  return {
    resumen,
    rendimiento_periodo: sets?.[0] || [],
    ventas_periodo: ventas,
    vendedores_historico_y_actual: vendedores,
    clientes_actuales: clientes,
    productos_actuales: productos.map((row) => ({ ...row, es_vendible: Boolean(Number(row.es_vendible)) })),
    interacciones_historicas: interacciones,
    correos_historicos: correos,
    pagination: { page, limit, pages: Math.max(1, Math.ceil(total / limit)), totales: counts },
  };
}
