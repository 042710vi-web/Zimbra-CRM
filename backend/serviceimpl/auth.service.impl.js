/**
 * Valida los datos y coordina las operaciones necesarias para gestionar auth.
 */
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';

import { findUserByEmail } from '../repository/Usuarios.repository.js';
import { consumeRecoveryToken, createRecoveryToken } from '../repository/RecuperacionClaves.repository.js';

import { env } from '../config/env.js';
import {
  canSendEmail,
  sendPasswordRecoveryEmail,
} from '../service/Email.service.js';

import { hashPassword } from '../utils/hash.js';
import { signToken } from '../utils/jwt.js';
import {
  httpError,
  requireEmail,
  requirePassword,
  requireText,
} from '../utils/validators.js';

const RECOVERY_MINUTES = 30;

/** Apoya la gestión de auth mediante una tarea interna del sistema. */
const sha256 = (value) =>
  crypto.createHash('sha256').update(value).digest('hex');

// HU-01: valida credenciales y devuelve el token JWT.
export async function login({ email, password }) {
  if (!email || !password) {
    throw Object.assign(
      new Error('Correo y contraseña son obligatorios.'),
      { status: 400 },
    );
  }

  const user = await findUserByEmail(email.trim().toLowerCase());

  if (
    !user ||
    !user.estado ||
    !(await bcrypt.compare(password, user.password_hash))
  ) {
    throw Object.assign(
      new Error('Credenciales incorrectas.'),
      { status: 401 },
    );
  }

  return {
    token: signToken(user),
    user: {
      id: user.id_usuario,
      email: user.correo_acceso,
      role: user.rol,
      vendorId: user.id_vendedor,
    },
  };
}

// HU-02: cerrar sesión. El cliente elimina su token.
export function logout() {
  return { message: 'Sesión cerrada correctamente.' };
}

// Solicita recuperar la contraseña.
// En producción envía el enlace por correo y nunca devuelve el token.
export async function requestPasswordReset({ email } = {}) {
  const correo = requireEmail(email, 'El correo');

  const message =
    'Si el correo está registrado, recibirás instrucciones para recuperar tu contraseña.';

  if (env.nodeEnv === 'production' && !canSendEmail()) {
    throw httpError(
      503,
      'El servicio de correo no está configurado. Contacta al administrador.',
    );
  }

  const user = await findUserByEmail(correo);

  // La respuesta es la misma si el correo no existe o la cuenta está inactiva.
  if (!user || !user.estado) {
    return { message };
  }

  const token = crypto.randomBytes(32).toString('hex');

  const resetUrl = new URL('/restablecer', env.frontendOrigin);
  resetUrl.searchParams.set('token', token);

  await createRecoveryToken({
    id_usuario: user.id_usuario,
    token_hash: sha256(token),
    expira_en: new Date(Date.now() + RECOVERY_MINUTES * 60 * 1000),
  });

  if (canSendEmail()) {
    try {
      await sendPasswordRecoveryEmail({
        to: user.correo_acceso,
        resetUrl: resetUrl.toString(),
        expiresMinutes: RECOVERY_MINUTES,
      });
    } catch (error) {
      console.error(
        'No fue posible enviar el correo de recuperación:',
        error.message,
      );
    }
  }

  // Solo en desarrollo se entrega el enlace para poder probar sin SMTP.
  if (env.nodeEnv === 'production') {
    return { message };
  }

  return {
    message,
    ...(canSendEmail() ? {} : { resetUrl: resetUrl.toString() }),
  };
}

// Cambia la contraseña si el token existe, no ha vencido y no se ha usado.
export async function resetPassword({ token, password } = {}) {
  const cleanToken = requireText(
    token,
    'El token de recuperación',
    200,
  );

  const newPassword = requirePassword(password);

  const changed = await consumeRecoveryToken({
    token_hash: sha256(cleanToken),
    password_hash: await hashPassword(newPassword),
  });

  if (!changed) {
    throw httpError(
      400,
      'El enlace de recuperación no es válido o ya venció.',
    );
  }

  return {
    message: 'Contraseña actualizada correctamente. Ya puedes iniciar sesión.',
  };
}