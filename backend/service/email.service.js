/**
 * Presenta las operaciones que otras partes del sistema pueden utilizar para gestionar email.
 */
import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

const smtpConfigured =
  Boolean(env.smtpHost && env.smtpFrom) &&
  Boolean(env.smtpUser) === Boolean(env.smtpPassword);

const transporter = smtpConfigured
  ? nodemailer.createTransport({
      host: env.smtpHost,
      port: env.smtpPort,
      secure: env.smtpSecure || env.smtpPort === 465,
      ...(env.smtpUser
        ? {
            auth: {
              user: env.smtpUser,
              pass: env.smtpPassword,
            },
          }
        : {}),
    })
  : null;

/** Pone esta operación a disposición de las demás partes del sistema. */
export const canSendEmail = () => Boolean(transporter);

/** Pone esta operación a disposición de las demás partes del sistema. */
export async function sendPasswordRecoveryEmail({
  to,
  resetUrl,
  expiresMinutes,
}) {
  if (!transporter) {
    throw new Error('El servicio SMTP no está configurado.');
  }

  await transporter.sendMail({
    from: env.smtpFrom,
    to,
    subject: 'Recuperación de contraseña | Zimbra CRM',
    text: `Recibimos una solicitud para cambiar la contraseña de tu cuenta Zimbra CRM.

Abre este enlace para crear una contraseña nueva. Vence en ${expiresMinutes} minutos:
${resetUrl}

Si no solicitaste este cambio, ignora este correo.`,
    html: `
      <!doctype html>
      <html lang="es">
        <body style="margin:0;background:#f4f6fa;font-family:Arial,sans-serif;color:#172544">
          <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:14px;padding:36px">
            <p style="color:#536f9d;font-size:12px;letter-spacing:2px;font-weight:bold">ZIMBRA CRM</p>
            <h1 style="font-size:24px">Recupera tu contraseña</h1>
            <p>Recibimos una solicitud para cambiar la contraseña de tu cuenta. Usa el botón para elegir una nueva.</p>
            <p style="margin:28px 0">
              <a href="${resetUrl}" style="background:#1f55ad;color:#fff;text-decoration:none;padding:13px 20px;border-radius:8px;display:inline-block;font-weight:bold">
                Crear contraseña nueva
              </a>
            </p>
            <p style="color:#64748b;font-size:13px">El enlace vence en ${expiresMinutes} minutos y solo puede usarse una vez.</p>
            <p style="color:#64748b;font-size:13px">Si no solicitaste este cambio, ignora este correo.</p>
          </div>
        </body>
      </html>
    `,
  });
}