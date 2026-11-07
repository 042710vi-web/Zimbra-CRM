import { sequelize } from '../config/database.js';
import { Asignacion } from '../entity/asignacion.entity.js';
import { Cliente } from '../entity/cliente.entity.js';
import { Vendedor } from '../entity/vendedor.entity.js';

export async function createAssignment({ id_cliente, id_vendedor }) {
  return sequelize.transaction(async (transaction) => {
    const lock = { transaction, lock: transaction.LOCK.UPDATE };
    const vendor = await Vendedor.findOne({ where: { id_vendedor, estado: true }, ...lock });
    if (!vendor) throw Object.assign(new Error('El vendedor no existe o está inactivo.'), { status: 404 });
    const client = await Cliente.findByPk(id_cliente, lock);
    if (!client) throw Object.assign(new Error('El cliente indicado no existe.'), { status: 404 });
    await Asignacion.update(
      { estado: 'Finalizada', fecha_fin: new Date() },
      { where: { id_cliente, estado: 'Activa' }, transaction },
    );
    const assignment = await Asignacion.create({ id_cliente, id_vendedor, estado: 'Activa' }, { transaction });
    return { id_asignacion: assignment.id_asignacion, message: 'Cliente asignado correctamente.' };
  });
}
