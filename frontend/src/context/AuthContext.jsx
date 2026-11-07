import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { login as loginRequest } from '../services/auth.service.js';

const AuthContext = createContext(null);

function getStoredSession() {
  try { return JSON.parse(sessionStorage.getItem('zimbra-session') || 'null'); }
  catch { return null; }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(getStoredSession);

  const login = useCallback(async (credentials) => {
    const result = await loginRequest(credentials);
    sessionStorage.setItem('zimbra-session', JSON.stringify(result));
    setSession(result);
    return result;
  }, []);

  const logout = useCallback(() => {
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
