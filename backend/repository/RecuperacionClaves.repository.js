import { Op, QueryTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import { Usuario } from '../entity/usuario.entity.js';
import { RecuperacionClave } from '../entity/recuperacion-clave.entity.js';
import { registerChanges } from './auditoria.repository.js';

export async function findUserByEmail(email) {
  const rows = await sequelize.query(
    `SELECT
        u.id_usuario,
        u.id_vendedor,
        u.correo_acceso,
        u.password_hash,
        u.rol,
        u.estado,
        COALESCE(v.nombre_vendedor, u.correo_acceso) AS nombre
     FROM usuarios u
     LEFT JOIN vendedores v ON v.id_vendedor = u.id_vendedor
     WHERE u.correo_acceso = :email
     LIMIT 1`,
    {
      replacements: { email },
      type: QueryTypes.SELECT,
    },
  );

  return rows[0] || null;
}

// Se consulta en cada petición protegida para detectar usuarios desactivados
// y aplicar de inmediato cambios de rol o de vendedor.
export function findUserSessionById(id_usuario) {
  return Usuario.findByPk(id_usuario, {
    attributes: [
      'id_usuario',
      'id_vendedor',
      'correo_acceso',
      'rol',
      'estado',
    ],
  });
}

// Guarda el hash del token y anula solicitudes anteriores sin usar.
export async function createRecoveryToken({
  id_usuario,
  token_hash,
  expira_en,
}) {
  return sequelize.transaction(async (transaction) => {
    const user = await Usuario.findByPk(id_usuario, { transaction, lock: transaction.LOCK.UPDATE });
    if (!user) throw Object.assign(new Error('El usuario indicado no existe.'), { status: 404 });
    await RecuperacionClave.update(
      { usado_en: new Date() },
      {
        where: { id_usuario, usado_en: null },
        transaction,
      },
    );

    await RecuperacionClave.create(
      {
        id_usuario,
        token_hash,
        creado_en: new Date(),
        expira_en,
      },
      { transaction },
    );
  });
}

// Cambia la contraseña solo si el token existe, no venció y no se usó.
export async function consumeRecoveryToken({
  token_hash,
  password_hash,
}) {
  return sequelize.transaction(async (transaction) => {
    const recovery = await RecuperacionClave.findOne({
      where: {
        token_hash,
        usado_en: null,
        expira_en: { [Op.gt]: new Date() },
      },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!recovery) return false;

    const user = await Usuario.findByPk(recovery.id_usuario, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!user || !user.estado) return false;

    await user.update({ password_hash }, { transaction });
    await recovery.update({ usado_en: new Date() }, { transaction });

    await registerChanges({
      tabla: 'usuarios',
      idRegistro: user.id_usuario,
      usuario: user.correo_acceso,
      transaction,
      cambios: {
        password_hash: [
          '(anterior)',
          '(restablecida por recuperación)',
        ],
      },
    });

    return true;
  });
}