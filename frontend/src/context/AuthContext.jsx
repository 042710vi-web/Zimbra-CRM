import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { login as loginRequest } from '../services/auth.service.js';

const AuthContext = createContext(null);

function normalizeSession(value) {
  const candidate = value?.data?.token ? value.data : value;
  if (!candidate?.token || !candidate?.user || typeof candidate.user !== 'object') return null;
  return { token: candidate.token, user: candidate.user };
}

function getStoredSession() {
  try {
    const session = normalizeSession(JSON.parse(sessionStorage.getItem('zimbra-session') || 'null'));
    if (!session) sessionStorage.removeItem('zimbra-session');
    return session;
  }
  catch { return null; }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(getStoredSession);

  const login = useCallback(async (credentials) => {
    const result = normalizeSession(await loginRequest(credentials));
    if (!result) throw new Error('El servidor respondió sin los datos de sesión esperados.');
    sessionStorage.setItem('zimbra-session', JSON.stringify(result));
    setSession(result);
    return result;
  }, []);

  const logout = useCallback(() => {
    // HU-01: cerrar sesión elimina el token local; no requiere endpoint remoto.
    sessionStorage.removeItem('zimbra-session');
    setSession(null);
  }, []);

  const value = useMemo(() => ({ session, login, logout }), [session, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuthContext debe usarse dentro de AuthProvider.');
  return value;
}
