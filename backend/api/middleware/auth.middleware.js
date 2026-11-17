import { verifyToken } from '../../utils/jwt.js';
import { findUserSessionById } from '../../repository/RecuperacionClaves.repository.js';

export async function authenticate(req, res, next) {
  const [scheme, token] = (req.headers.authorization || '').split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({
      message: 'Autenticación requerida.',
    });
  }

  let tokenUser;

  try {
    tokenUser = verifyToken(token);
  } catch {
    return res.status(401).json({
      message: 'Token inválido o vencido.',
    });
  }

  try {
    const user = await findUserSessionById(tokenUser.id);

    if (!user || !user.estado) {
      return res.status(401).json({
        message: 'La cuenta está deshabilitada o la sesión venció.',
      });
    }

    // Usa el rol y vendedor vigentes en la base de datos, no los valores antiguos
    // que pudieron quedar dentro del token.
    req.user = {
      id: user.id_usuario,
      role: user.rol,
      vendorId: user.id_vendedor,
      email: user.correo_acceso,
    };

    return next();
  } catch (error) {
    return next(error);
  }
}
