/**
 * Consulta y guarda en la base de datos la información de recuperacion claves.
 */
import { Op } from 'sequelize';
import { sequelize } from '../config/database.js';
import { RecuperacionClave } from '../entity/RecuperacionClaves.entity.js';
import { Usuario } from '../entity/Usuarios.entity.js';
import { registerChanges } from './AuditoriaCambios.repository.js';

// El sistema reemplaza los tokens anteriores que todavía no se han utilizado.
export async function createRecoveryToken({ id_usuario, token_hash, expira_en }) {
  return sequelize.transaction(async (transaction) => {
    const user = await Usuario.findByPk(id_usuario, { transaction, lock: transaction.LOCK.UPDATE });
    if (!user) throw Object.assign(new Error('El usuario indicado no existe.'), { status: 404 });
    await RecuperacionClave.update(
      { usado_en: new Date() },
      { where: { id_usuario, usado_en: null }, transaction },
    );
    await RecuperacionClave.create({ id_usuario, token_hash, creado_en: new Date(), expira_en }, { transaction });
  });
}

// El sistema consume el token una sola vez y actualiza la contraseña en una transacción.
export async function consumeRecoveryToken({ token_hash, password_hash }) {
  return sequelize.transaction(async (transaction) => {
    const recovery = await RecuperacionClave.findOne({
      where: { token_hash, usado_en: null, expira_en: { [Op.gt]: new Date() } },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!recovery) return false;
    const user = await Usuario.findByPk(recovery.id_usuario, { transaction, lock: transaction.LOCK.UPDATE });
    if (!user || !user.estado) return false;
    await user.update({ password_hash }, { transaction });
    await recovery.update({ usado_en: new Date() }, { transaction });
    await registerChanges({
      tabla: 'usuarios',
      idRegistro: user.id_usuario,
      usuario: user.correo_acceso,
      transaction,
      cambios: { password_hash: ['(anterior)', '(restablecida por recuperación)'] },
    });
    return true;
  });
}