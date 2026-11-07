import app from './app.js';
import { env } from '../config/env.js';
import { sequelize } from '../config/database.js';

await sequelize.authenticate();
console.log('Conexión a MySQL establecida con Sequelize.');
const server = app.listen(env.port, () => console.log(`API Zimbra escuchando en http://localhost:${env.port}`));
async function shutdown() {
  server.close(async () => { await sequelize.close(); process.exit(0); });
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
