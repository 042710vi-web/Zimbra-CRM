import { expireTrialDates } from '../service/DescargasPrueba.service.js';

let timer;
const ONE_DAY = 24 * 60 * 60 * 1000;

// El programador ejecuta la actualización de vencimientos al iniciar y cada 24 horas.
export function startTrialExpirationSchedule() {
  if (timer) return;
  const run = async () => {
    try {
      const result = await expireTrialDates({ email: 'tarea-programada' });
      console.info(`Pruebas vencidas actualizadas: ${result.vencidas}.`);
    } catch (error) {
      console.error('No fue posible actualizar las pruebas vencidas:', error.message);
    } finally {
      timer = setTimeout(run, ONE_DAY);
      timer.unref?.();
    }
  };
  timer = setTimeout(run, 0);
  timer.unref?.();
}

// El programador detiene la tarea cuando el servidor se cierra.
export function stopTrialExpirationSchedule() {
  if (timer) clearTimeout(timer);
  timer = undefined;
}
