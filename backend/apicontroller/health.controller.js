import { sequelize } from '../config/database.js';

// Endpoint técnico común, sin HU de negocio asignada en el documento.
// Endpoint: GET /api/health
export async function getHealth(_req, res) {
  const checkedAt = new Date().toISOString();
  try {
    await sequelize.authenticate();
    return res.status(200).json({
      status: 'OK',
      server: 'OK',
      database: 'OK',
      checkedAt,
    });
  } catch {
    return res.status(503).json({
      status: 'ERROR',
      server: 'OK',
      database: 'ERROR',
      message: 'No fue posible conectar con MySQL.',
      checkedAt,
    });
  }
}
