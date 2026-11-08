// HU-03: restringe operaciones según el rol del usuario autenticado.
export const allowRoles = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) return res.status(403).json({ message: 'No tienes permiso para esta operación.' });
  return next();
};
