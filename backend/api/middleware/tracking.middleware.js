/** HU-15: Clave del emisor de eventos web. */
import { timingSafeEqual } from 'node:crypto';
export function authenticateTracking(req, res, next) {
  const expected = process.env.ZIMBRA_TRACKING_KEY;
  if (!expected) {
    console.warn('Evento de rastreo rechazado.', { estado: 503, motivo: 'Configuración ausente', ruta: req.originalUrl });
    return res.status(503).json({ message: 'El rastreo web no está configurado.' });
  }
  const actual = req.get('x-tracking-key');
  const valid = typeof actual === 'string' && Buffer.byteLength(actual) === Buffer.byteLength(expected)
    && timingSafeEqual(Buffer.from(actual), Buffer.from(expected));
  if (!valid) {
    console.warn('Evento de rastreo rechazado.', { estado: 401, motivo: 'Credencial inválida', ruta: req.originalUrl });
    return res.status(401).json({ message: 'Clave de rastreo inválida.' });
  }
  return next();
}
