import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export const signToken = (user) => jwt.sign(
  { id: user.id_usuario, role: user.rol, vendorId: user.id_vendedor ?? null, email: user.correo_acceso },
  env.jwtSecret,
  { expiresIn: env.jwtExpiresIn },
);

export const verifyToken = (token) => jwt.verify(token, env.jwtSecret);
