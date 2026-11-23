import { useCallback, useEffect, useState } from 'react';
import { useAuth } from './useAuth.js';
import { allOptions, queryString, readModule } from '../services/modulos.service.js';

export function useModuleQuery(path, params = {}, { enabled = true, pollMs = 0, all = false } = {}) {
  const { session, logout } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(enabled);
  const [revision, setRevision] = useState(0);
  const encoded = queryString(params);
  const reload = useCallback(() => setRevision((value) => value + 1), []);

  useEffect(() => {
    if (!enabled || !path || !session?.token) { setLoading(false); setData(null); setError(''); return; }
    const controller = new AbortController();
    let timer;
    setData(null); setLoading(true); setError('');
    async function load() {
      try {
        const filters = Object.fromEntries(new URLSearchParams(encoded));
        const result = await (all ? allOptions(session.token, path, filters, controller.signal) : readModule(session.token, path, filters, controller.signal));
        if (!controller.signal.aborted) { setData(result); setError(''); }
      } catch (cause) {
        if (!controller.signal.aborted) { if (cause.status === 401) logout(); setError(cause.message); }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
          if (pollMs) timer = setTimeout(load, pollMs);
        }
      }
    }
    load();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [session?.token, logout, path, encoded, enabled, pollMs, all, revision]);
  return { data, error, loading, reload };
}
