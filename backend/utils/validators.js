// HU-36: validaciones reutilizables que devuelven mensajes claros al usuario.
export const CLIENT_STATES = ['Frio', 'Tibio', 'Calificado', 'En Negociacion', 'Cliente', 'Convertido', 'Descartado', 'Inactivo'];
export const USER_ROLES = ['Administrador', 'Vendedor'];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const httpError = (status, message) => Object.assign(new Error(message), { status });

export const isEmail = (value) => typeof value === 'string' && EMAIL_PATTERN.test(value.trim());

export function requireText(value, label, max = 150) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) throw httpError(400, `${label} es obligatorio.`);
  if (text.length > max) throw httpError(400, `${label} no puede superar ${max} caracteres.`);
  return text;
}

export function optionalText(value, label, max = 150) {
  if (value === undefined || value === null || String(value).trim() === '') return null;
  const text = String(value).trim();
  if (text.length > max) throw httpError(400, `${label} no puede superar ${max} caracteres.`);
  return text;
}

export function requireEmail(value, label = 'El correo electrónico', max = 100) {
  const email = requireText(value, label, max).toLowerCase();
  if (!isEmail(email)) throw httpError(400, `${label} no tiene un formato válido.`);
  return email;
}

export function requireId(value, label) {
  const id = Number(value);
  if (!Number.isInteger(id) || id < 1) throw httpError(400, `${label} debe ser un número entero válido.`);
  return id;
}

export function optionalId(value, label) {
  return value === undefined || value === null || value === '' ? null : requireId(value, label);
}

export function requireOneOf(value, label, allowed) {
  if (!allowed.includes(value)) throw httpError(400, `${label} debe ser uno de: ${allowed.join(', ')}.`);
  return value;
}

export function optionalPhone(value) {
  const phone = optionalText(value, 'El teléfono', 50);
  if (phone && !/^[0-9+()\-\s]{6,50}$/.test(phone)) throw httpError(400, 'El teléfono solo puede tener números, espacios, + - ( ).');
  return phone;
}

export function optionalUrl(value, label = 'El sitio web') {
  const url = optionalText(value, label, 150);
  if (url && !/^https?:\/\/\S+\.\S+$/i.test(url)) throw httpError(400, `${label} debe empezar por http:// o https://.`);
  return url;
}

export function requirePassword(value) {
  const password = typeof value === 'string' ? value : '';
  if (password.length < 8 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    throw httpError(400, 'La contraseña debe tener mínimo 8 caracteres, con letras y números.');
  }
  return password;
}

export function pagination(query = {}) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 10));
  return { page, limit, offset: (page - 1) * limit };
}
