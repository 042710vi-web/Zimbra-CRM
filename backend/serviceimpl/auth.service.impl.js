import bcrypt from 'bcryptjs';
import { findUserByEmail } from '../repository/auth.repository.js';
import { signToken } from '../utils/jwt.js';

// HU-01: valida credenciales y devuelve el token JWT.
export async function login({ email, password }) {
  if (!email || !password) throw Object.assign(new Error('Correo y contraseña son obligatorios.'), { status: 400 });
  const user = await findUserByEmail(email.trim().toLowerCase());
  if (!user || !user.estado || !(await bcrypt.compare(password, user.password_hash))) {
    throw Object.assign(new Error('Credenciales incorrectas.'), { status: 401 });
  }
  return {
    token: signToken(user),
    user: { id: user.id_usuario, email: user.correo_acceso, role: user.rol, vendorId: user.id_vendedor },
  };
}

// HU-02: el JWT no se guarda en el servidor; el cliente elimina su token al cerrar sesión.
export function logout() {
  return { message: 'Sesión cerrada correctamente.' };
}
