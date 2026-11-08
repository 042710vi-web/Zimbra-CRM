import { Op } from 'sequelize';
import { sequelize } from '../config/database.js';
import { Usuario } from '../entity/usuario.entity.js';
import { RecuperacionClave } from '../entity/recuperacion-clave.entity.js';
import { registerChanges } from './auditoria.repository.js';

export const findUserByEmail = (email) => Usuario.findOne({
  where: { correo_acceso: email },
  attributes: ['id_usuario', 'id_vendedor', 'correo_acceso', 'password_hash', 'rol', 'estado'],
});

// HU-01 (recuperar contraseña): guarda un token nuevo y anula los anteriores sin usar.
export async function createRecoveryToken({ id_usuario, token_hash, expira_en }) {
  return sequelize.transaction(async (transaction) => {
    await RecuperacionClave.update(
      { usado_en: new Date() },
      { where: { id_usuario, usado_en: null }, transaction },
    );
    await RecuperacionClave.create({ id_usuario, token_hash, creado_en: new Date(), expira_en }, { transaction });
  });
}

// HU-01 (recuperar contraseña): cambia la clave solo si el token existe, no se usó y no ha vencido.
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
    // HU-35: queda registrado el cambio, sin guardar la contraseña ni su hash.
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
