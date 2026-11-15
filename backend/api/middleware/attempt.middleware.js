const MAX_FAILED_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;
const BLOCK_MS = 15 * 60 * 1000;

const attemptsByIp = new Map();

export function loginAttemptLimiter(req, res, next) {
  const now = Date.now();
  const ip = req.ip || req.socket.remoteAddress || 'unknown';

  // Retira entradas vencidas para que el mapa no crezca indefinidamente.
  for (const [key, value] of attemptsByIp) {
    if (value.resetAt <= now && (!value.blockedUntil || value.blockedUntil <= now)) {
      attemptsByIp.delete(key);
    }
  }

  const current = attemptsByIp.get(ip);

  if (current?.blockedUntil && current.blockedUntil > now) {
    const seconds = Math.ceil((current.blockedUntil - now) / 1000);

    return res.status(429).json({
      message: `Demasiados intentos fallidos. Intenta nuevamente en ${seconds} segundos.`,
    });
  }

  res.once('finish', () => {
    const status = res.statusCode;
    const previous = attemptsByIp.get(ip);

    if (status === 401) {
      const failedAttempts =
        previous && previous.resetAt > now
          ? previous.failedAttempts + 1
          : 1;

      attemptsByIp.set(ip, {
        failedAttempts,
        resetAt: now + WINDOW_MS,
        blockedUntil:
          failedAttempts >= MAX_FAILED_ATTEMPTS
            ? Date.now() + BLOCK_MS
            : null,
      });

      return;
    }

    if (status < 400) {
      attemptsByIp.delete(ip);
    }
  });

  return next();
}