import { sequelize } from '../config/database.js';
import { Cliente } from '../entity/cliente.entity.js';
import { Empresa } from '../entity/empresa.entity.js';

export async function createClient(data) {
  return sequelize.transaction(async (transaction) => {
    let companyId = data.id_empresa ? Number(data.id_empresa) : null;
    if (!companyId && data.nombre_empresa?.trim()) {
      const [company] = await Empresa.findOrCreate({
        where: { nombre_empresa: data.nombre_empresa.trim() },
        defaults: {
          sector_industria: data.sector_industria || null,
          sitio_web: data.sitio_web || null,
        },
        transaction,
      });
      companyId = company.id_empresa;
    }
    const client = await Cliente.create({
      id_empresa: companyId,
      nombre_completo: data.nombre_completo.trim(),
      correo_electronico: data.correo_electronico.trim().toLowerCase(),
      telefono: data.telefono || null,
    }, { transaction });
    return client.id_cliente;
  });
}
