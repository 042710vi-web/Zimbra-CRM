import 'dotenv/config';

export const env = {
  port: Number(process.env.PORT || 3000),
  frontendOrigin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173',
  jwtSecret: process.env.JWT_SECRET || 'cambia-esto-por-una-clave-larga-y-segura',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
};
