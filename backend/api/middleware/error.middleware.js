export function errorHandler(error, _req, res, _next) {
  if (
    error.name === 'SequelizeUniqueConstraintError' ||
    error.code === 'ER_DUP_ENTRY'
  ) {
    return res.status(409).json({
      ok: false,
      message: 'El correo o dato único ya está registrado.',
    });
  }

  if (
    error.name === 'SequelizeForeignKeyConstraintError' ||
    error.code === 'ER_NO_REFERENCED_ROW_2'
  ) {
    return res.status(400).json({
      ok: false,
      message: 'La referencia indicada no existe.',
    });
  }

  if (error.name === 'SequelizeValidationError') {
    return res.status(400).json({
      ok: false,
      message: 'Los datos enviados no son válidos.',
      errors: error.errors?.map((item) => ({
        campo: item.path,
        mensaje: item.message,
      })),
    });
  }

  const dbCode = error.parent?.code || error.original?.code || error.code;

  if (dbCode === 'ER_SIGNAL_EXCEPTION') {
    const message = error.parent?.sqlMessage || error.original?.sqlMessage || error.message;
    const conflict = /ya tiene una asignación|asignación activa|no está pendiente|solo se pueden editar|límite de .*intentos|ya fue enviado/i.test(message);
    return res.status(conflict ? 409 : 400).json({ message });
  }

  if (dbCode === 'ER_CHECK_CONSTRAINT_VIOLATED') {
    return res.status(400).json({
      ok: false,
      message: 'Alguno de los valores enviados no está permitido.',
    });
  }

  if (dbCode === 'ER_DATA_TOO_LONG') {
    return res.status(400).json({
      ok: false,
      message: 'Alguno de los textos enviados es demasiado largo.',
    });
  }

  const status = error.status || 500;

  if (status >= 500) console.error(error);

  return res.status(status).json({
    ok: false,
    message:
      status < 500 ? error.message : 'Error interno del servidor.',
  });
}
