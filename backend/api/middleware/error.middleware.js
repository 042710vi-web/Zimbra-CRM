// HU-36: Traduce errores de validación y restricciones a respuestas entendibles.
export function errorHandler(error, _req, res, _next) {
  if (error.name === 'SequelizeUniqueConstraintError' || error.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'Uno de los datos únicos ya está registrado.' });
  if (error.name === 'SequelizeForeignKeyConstraintError' || error.code === 'ER_NO_REFERENCED_ROW_2') return res.status(400).json({ message: 'La referencia indicada no existe.' });
  if (error.name === 'SequelizeValidationError') return res.status(400).json({ message: 'Los datos enviados no son válidos.' });
  const dbCode = error.parent?.code || error.original?.code || error.code;
  if (dbCode === 'ER_CHECK_CONSTRAINT_VIOLATED') return res.status(400).json({ message: 'Alguno de los valores enviados no está permitido.' });
  if (dbCode === 'ER_DATA_TOO_LONG') return res.status(400).json({ message: 'Alguno de los textos enviados es demasiado largo.' });
  console.error(error);
  return res.status(error.status || 500).json({ message: error.status ? error.message : 'Error interno del servidor.' });
}
