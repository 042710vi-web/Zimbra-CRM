import { Usuario } from '../entity/usuario.entity.js';

export const findUserByEmail = (email) => Usuario.findOne({
  where: { correo_acceso: email },
  attributes: ['id_usuario', 'id_vendedor', 'correo_acceso', 'password_hash', 'rol', 'estado'],
});
