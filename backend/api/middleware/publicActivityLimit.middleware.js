const WINDOW_MS = 60_000;
const MAX_EVENTS = 30;
const requestsByIp = new Map();

/** Limits anonymous site activity so the public simulation cannot flood the event table. */
export function limitPublicActivity(req, res, next) {
  const now = Date.now();
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  for (const [key, entry] of requestsByIp) {
    if (entry.resetAt <= now) requestsByIp.delete(key);
  }
  if (requestsByIp.size >= 10_000 && !requestsByIp.has(ip)) {
    return res.status(503).json({ message: 'El registro público de actividad está temporalmente ocupado.' });
  }

  const entry = requestsByIp.get(ip);
  if (entry && entry.count >= MAX_EVENTS && entry.resetAt > now) {
    return res.status(429).json({ message: 'Se alcanzó el límite temporal de eventos. Intenta de nuevo en un minuto.' });
  }

  if (entry && entry.resetAt > now) entry.count += 1;
  else requestsByIp.set(ip, { count: 1, resetAt: now + WINDOW_MS });
  return next();
}
