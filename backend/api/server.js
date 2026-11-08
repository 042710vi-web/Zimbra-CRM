import app from './app.js';
import { env } from '../config/env.js';
import { sequelize } from '../config/database.js';

const server = app.listen(env.port, () => console.log(`API Zimbra escuchando en http://localhost:${env.port}`));
sequelize.authenticate()
  .then(() => console.log('Conexión a MySQL establecida con Sequelize.'))
  .catch(() => console.error('MySQL no está disponible; consulta GET /api/health para ver el estado.'));
async function shutdown() {
  server.close(async () => { await sequelize.close(); process.exit(0); });
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
