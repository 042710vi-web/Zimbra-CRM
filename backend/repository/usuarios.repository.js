/**
 * Consulta y guarda en la base de datos la información de usuarios.
 */
import { QueryTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import { Usuario } from '../entity/Usuarios.entity.js';
import { Vendedor } from '../entity/Vendedores.entity.js';
import { registerChanges } from './AuditoriaCambios.repository.js';

// Localiza la cuenta que corresponde al correo usado durante el inicio de sesión.
export const findUserByEmail = (email) => Usuario.findOne({
  where: { correo_acceso: email },
  attributes: ['id_usuario', 'id_vendedor', 'correo_acceso', 'password_hash', 'rol', 'estado'],
});
import { httpError } from '../utils/validators.js';

// HU-03: listar usuarios sin exponer el hash de la contraseña.
export const findUsers = ({ q, rol, estado }) =>
  sequelize.query(
    `SELECT
        u.id_usuario,
        u.id_vendedor,
        u.correo_acceso,
        u.rol,
        u.estado,
        u.fecha_creacion,
        v.nombre_vendedor
     FROM usuarios u
     LEFT JOIN vendedores v ON v.id_vendedor = u.id_vendedor
     WHERE (:q IS NULL
            OR u.correo_acceso LIKE :like
            OR v.nombre_vendedor LIKE :like)
       AND (:rol IS NULL OR u.rol = :rol)
       AND (:estado IS NULL OR u.estado = :estado)
     ORDER BY u.id_usuario DESC`,
    {
      replacements: {
        q: q || null,
        like: `%${q || ''}%`,
        rol: rol || null,
        estado,
      },
      type: QueryTypes.SELECT,
    },
  );

export const findActiveVendor = (id_vendedor) => Vendedor.findOne({ where: { id_vendedor, estado: true } });

export async function createUser(data, usuario) {
  return sequelize.transaction(async (transaction) => {
    if (data.rol === 'Vendedor' && data.id_vendedor) {
      // Bloquea el registro del vendedor mientras se comprueba la asociación.
      const vendor = await Vendedor.findByPk(data.id_vendedor, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!vendor || !vendor.estado) {
        throw httpError(404, 'El vendedor no existe o está inactivo.');
      }

      const existingActiveUser = await Usuario.findOne({
        where: {
          id_vendedor: data.id_vendedor,
          estado: true,
        },
        transaction,
      });

      if (existingActiveUser) {
        throw httpError(
          409,
          'Ese vendedor ya tiene un usuario activo asociado.',
        );
      }
    }

    const user = await Usuario.create(
      {
        ...data,
        estado: true,
      },
      { transaction },
    );

    await registerChanges({
      tabla: 'usuarios',
      idRegistro: user.id_usuario,
      usuario,
      transaction,
      cambios: {
        rol: [null, data.rol],
        estado: [null, 1],
      },
    });

    return user.id_usuario;
  });
}

// HU-03: activar o desactivar usuarios y guardar la auditoría.
export async function updateUserStatus(
  { id_usuario, estado },
  usuario,
) {
  return sequelize.transaction(async (transaction) => {
    const user = await Usuario.findByPk(id_usuario, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!user) {
      throw Object.assign(
        new Error('El usuario indicado no existe.'),
        { status: 404 },
      );
    }

    const previous = Boolean(user.estado);

    await user.update({ estado }, { transaction });

    await registerChanges({
      tabla: 'usuarios',
      idRegistro: id_usuario,
      usuario,
      transaction,
      cambios: {
        estado: [previous ? 1 : 0, estado ? 1 : 0],
      },
    });
  });
}