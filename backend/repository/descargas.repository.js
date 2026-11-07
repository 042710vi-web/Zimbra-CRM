import { sequelize } from '../config/database.js';
import { AccionMarketing } from '../entity/accion-marketing.entity.js';
import { Cliente } from '../entity/cliente.entity.js';
import { DescargaPrueba } from '../entity/descarga.entity.js';
import { Producto } from '../entity/producto.entity.js';

export async function createTrial({ id_cliente, id_producto }) {
  return sequelize.transaction(async (transaction) => {
    const lock = { transaction, lock: transaction.LOCK.UPDATE };
    const product = await Producto.findOne({ where: { id_producto, estado: true, tipo_licencia: 'Prueba 60 dias' }, ...lock });
    if (!product) throw Object.assign(new Error('El producto no existe o no es una licencia de prueba.'), { status: 400 });
    const client = await Cliente.findByPk(id_cliente, lock);
    if (!client) throw Object.assign(new Error('El cliente indicado no existe.'), { status: 404 });

    const trial = await DescargaPrueba.create({
      id_cliente,
      id_producto,
      fecha_inicio: sequelize.literal('CURRENT_DATE'),
      fecha_fin: sequelize.literal('DATE_ADD(CURRENT_DATE, INTERVAL 60 DAY)'),
      estado_prueba: 'Activa',
    }, { transaction });
    const action = await AccionMarketing.findOne({
      where: { nombre_accion: 'Descarga de prueba (60 días)', estado: true }, transaction,
    });
    const score = action?.puntaje || 0;
    if (score) await client.increment('puntaje_total', { by: score, transaction });
    return { id_descarga: trial.id_descarga, puntos_agregados: score, message: 'Prueba registrada por 60 días.' };
  });
}
