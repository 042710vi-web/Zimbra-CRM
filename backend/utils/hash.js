import bcrypt from 'bcryptjs';

// HU-04: las contraseñas nunca se guardan en texto plano.
export const hashPassword = (password) => bcrypt.hash(password, 12);
export const comparePassword = (password, hash) => bcrypt.compare(password, hash);
