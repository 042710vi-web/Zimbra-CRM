import { useState } from 'react';
import { useAuth } from './useAuth.js';

export function useApiAction() {
  const { logout } = useAuth();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);

  async function run(action) {
    setBusy(true);
    setNotice(null);
    try {
      const result = await action();
      setNotice({ type: 'success', text: result?.message || 'Operación completada correctamente.' });
      return result;
    } catch (error) {
      // HU-03: una respuesta 401 finaliza la sesión en el cliente.
      // HU-36: muestra el mensaje que entrega el backend para la operación.
      if (error.status === 401) logout();
      setNotice({ type: 'error', text: error.message });
      return null;
    } finally { setBusy(false); }
  }

  return { busy, notice, setNotice, run };
}
