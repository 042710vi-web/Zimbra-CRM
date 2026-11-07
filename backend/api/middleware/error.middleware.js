export function errorHandler(error, _req, res, _next) {
  if (error.name === 'SequelizeUniqueConstraintError' || error.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'El correo o dato único ya está registrado.' });
  if (error.name === 'SequelizeForeignKeyConstraintError' || error.code === 'ER_NO_REFERENCED_ROW_2') return res.status(400).json({ message: 'La referencia indicada no existe.' });
  if (error.name === 'SequelizeValidationError') return res.status(400).json({ message: 'Los datos enviados no son válidos.' });
  console.error(error);
  return res.status(error.status || 500).json({ message: error.status ? error.message : 'Error interno del servidor.' });
}
