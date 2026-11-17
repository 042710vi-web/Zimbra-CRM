import { QueryTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import { sendBusinessEmail } from '../service/email.service.js';
import { callProcedure } from './storedProcedures.repository.js';

export async function listEmails({ estado, id_cliente, page, limit }) {
  const where = ['1 = 1']; const replacements = { limit, offset: (page - 1) * limit };
  if (estado) { where.push('ce.estado_correo = :estado'); replacements.estado = estado; }
  if (id_cliente) { where.push('ce.id_cliente = :id_cliente'); replacements.id_cliente = id_cliente; }
  const clause = where.join(' AND ');
  const [count] = await sequelize.query(`SELECT COUNT(*) total FROM correos_enviados ce WHERE ${clause}`, { replacements, type: QueryTypes.SELECT });
  const rows = await sequelize.query(`SELECT ce.id_correo, ce.id_cliente, c.nombre_completo, ce.id_plantilla, ce.evento, ce.correo_destino, ce.asunto_enviado, ce.estado_correo, ce.intentos, ce.ultimo_error, ce.fecha_creacion, ce.fecha_envio, ce.proximo_intento FROM correos_enviados ce JOIN clientes c ON c.id_cliente = ce.id_cliente WHERE ${clause} ORDER BY ce.fecha_creacion DESC LIMIT :limit OFFSET :offset`, { replacements, type: QueryTypes.SELECT });
  return { rows, count: Number(count.total) };
}

export async function sendAutomatedEmail({ id_cliente, id_descarga, evento, variables = {} }) {
  const clave = id_descarga === undefined ? `${evento}_${id_cliente}` : `${evento}_${id_cliente}_descarga_${id_descarga}`;
  const [previous] = await sequelize.query('SELECT id_correo, estado_correo FROM correos_enviados WHERE clave_idempotencia = :clave', { replacements: { clave }, type: QueryTypes.SELECT });
  if (previous?.estado_correo === 'Enviado') return { id_cliente, evento, estado_correo: 'Enviado', duplicado: true };
  if (previous?.estado_correo === 'Fallido') return retryEmail(previous.id_correo);
  if (previous) throw Object.assign(new Error('El correo para este evento ya está en proceso.'), { status: 409 });
  const [template] = await sequelize.query('SELECT * FROM plantillas_correo WHERE evento = :evento AND estado = TRUE LIMIT 1', { replacements: { evento }, type: QueryTypes.SELECT });
  if (!template) throw Object.assign(new Error('No existe una plantilla activa para el evento.'), { status: 404 });
  const [client] = await sequelize.query('SELECT correo_electronico FROM clientes WHERE id_cliente = :id', { replacements: { id: id_cliente }, type: QueryTypes.SELECT });
  if (!client) throw Object.assign(new Error('No existe el cliente indicado.'), { status: 404 });
  const render = (value) => String(value).replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (_match, key) => String(variables[key] ?? ''));
  const subject = render(template.asunto); const body = render(template.cuerpo);
  // Los avisos de prueba reservan una clave por descarga antes de usar SMTP.
  // El flujo sin contexto de descarga conserva el contrato general de HU-19.
  let reserva;
  if (id_descarga !== undefined) {
    reserva = await callProcedure('sp_reservar_correo_prueba', [id_cliente, id_descarga, evento, subject, body]);
    if (reserva.estado_correo === 'Enviado') return { id_cliente, evento, estado_correo: 'Enviado', duplicado: true };
    if (reserva.estado_correo === 'Fallido') return retryEmail(reserva.id_correo);
  }
  try {
    await sendBusinessEmail({ to: client.correo_electronico, subject, text: body });
    if (reserva) await callProcedure('sp_resultado_correo_prueba', [reserva.id_correo, true, null]);
    else await callProcedure('sp_enviar_correo_automatico', [id_cliente, evento, subject, body]);
    return { id_cliente, evento, estado_correo: 'Enviado' };
  } catch (cause) {
    if (reserva) {
      await callProcedure('sp_resultado_correo_prueba', [reserva.id_correo, false, String(cause.message)]);
      throw cause;
    }
    await sequelize.query(`INSERT INTO correos_enviados (id_cliente, id_plantilla, clave_idempotencia, evento, correo_destino, asunto_enviado, cuerpo_enviado, estado_correo, ultimo_error)
      VALUES (:id_cliente, :id_plantilla, :clave, :evento, :destino, :asunto, :cuerpo, 'Fallido', :error)
      ON DUPLICATE KEY UPDATE estado_correo = IF(estado_correo = 'Enviado', estado_correo, 'Fallido'), ultimo_error = VALUES(ultimo_error)`, {
      replacements: { id_cliente, id_plantilla: template.id_plantilla, clave, evento, destino: client.correo_electronico, asunto: subject, cuerpo: body, error: String(cause.message).slice(0, 1000) },
    });
    throw cause;
  }
}

export async function retryEmail(id_correo) {
  const [row] = await sequelize.query("SELECT * FROM correos_enviados WHERE id_correo = :id AND estado_correo = 'Fallido'", { replacements: { id: id_correo }, type: QueryTypes.SELECT });
  if (!row) throw Object.assign(new Error('No existe un correo fallido con ese ID.'), { status: 404 });
  if (Number(row.intentos) >= 3) throw Object.assign(new Error('El correo alcanzó el máximo de 3 intentos.'), { status: 409 });
  const [claim] = await sequelize.query("UPDATE correos_enviados SET estado_correo = 'Pendiente', ultimo_error = NULL WHERE id_correo = :id AND estado_correo = 'Fallido'", { replacements: { id: id_correo } });
  if (!claim.affectedRows) throw Object.assign(new Error('El correo ya está siendo reintentado o cambió de estado.'), { status: 409 });
  try {
    await sendBusinessEmail({ to: row.correo_destino, subject: row.asunto_enviado, text: row.cuerpo_enviado });
    await sequelize.query("UPDATE correos_enviados SET estado_correo = 'Enviado', ultimo_error = NULL, fecha_envio = NOW(), proximo_intento = NULL WHERE id_correo = :id AND estado_correo = 'Pendiente'", { replacements: { id: id_correo } });
    return { id_correo, estado_correo: 'Enviado', message: 'Correo reenviado.' };
  } catch (cause) {
    await sequelize.query("UPDATE correos_enviados SET estado_correo = 'Fallido', ultimo_error = :error, proximo_intento = NULL WHERE id_correo = :id AND estado_correo = 'Pendiente'", { replacements: { id: id_correo, error: String(cause.message).slice(0, 1000) } });
    throw Object.assign(new Error(`No se pudo reenviar el correo: ${cause.message}`), { status: 502 });
  }
}
