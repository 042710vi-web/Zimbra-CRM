import { normalizeSearchValue } from '../utils/search.js';
import { validPageSize } from '../components/common/PagedTable.jsx';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

export function useModuleFilters(defaults) {
  const [search, setSearch] = useSearchParams();
  const defaultsKey = JSON.stringify(defaults);
  const filtersKey = JSON.stringify(Object.fromEntries(Object.entries(defaults).map(([key, value]) => [key, normalizeSearchValue(search.get(key) ?? value)])));
  const filters = useMemo(() => JSON.parse(filtersKey), [filtersKey]);
  const pendingReset = useRef(null);
  const clearedDraftKeys = useRef([]);
  const [draft, setDraft] = useState(filters);
  useEffect(() => setDraft({ ...filters, ...Object.fromEntries(clearedDraftKeys.current.map(key => [key, ''])) }), [filters]);
  const page = Math.max(1, Number.parseInt(search.get('page'), 10) || 1);
  const limit = validPageSize(search.get('limit'));
  function setLimit(value) { const next = new URLSearchParams(search); next.set('limit', String(validPageSize(value))); next.set('page', '1'); setSearch(next); }
  function apply(event, values = draft, clearKeys = []) { event?.preventDefault(); clearedDraftKeys.current = clearKeys; pendingReset.current = { loading: false }; setSearch(Object.fromEntries(Object.entries({ ...values, page: 1, limit }).map(([key, value]) => [key, normalizeSearchValue(value)]).filter(([, value]) => value !== ''))); if (clearKeys.length) setDraft(current => ({ ...current, ...Object.fromEntries(clearKeys.map(key => [key, ''])) })); }
  function setPage(value) { const next = new URLSearchParams(search); next.set('page', String(value)); setSearch(next); }
  function reset() { pendingReset.current = null; clearedDraftKeys.current = []; setDraft(JSON.parse(defaultsKey)); setSearch({}); }
  const finishQuery = useCallback((request, keys) => {
    if (!pendingReset.current) return;
    if (request.loading) { pendingReset.current.loading = true; return; }
    if (!pendingReset.current.loading) return;
    pendingReset.current = null;
    if (request.error || !request.data) return;
    setDraft((current) => ({ ...current, ...Object.fromEntries(keys.map((key) => [key, ''])) }));
  }, []);
  return { finishQuery, filters, draft, setDraft, page, setPage, limit, setLimit, apply, reset };
}

export function useResetSelectsAfterQuery(search, request, keys) {
  const keysKey = JSON.stringify(keys);
  const finishQuery = search.finishQuery;
  const { data, loading, error } = request;
  useEffect(() => { finishQuery({ data, loading, error }, JSON.parse(keysKey)); }, [finishQuery, data, loading, error, keysKey]);
}
