import SearchInput from '../../components/common/SearchInput.jsx';
import { TablePagination } from '../../components/common/PagedTable.jsx';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../hooks/useAuth.js';
import { useApiAction } from '../../hooks/useApiAction.js';
import { listCompanies, createCompany, getCompany, listAudit, listSyncs, syncClient, retrySync } from '../../services/gestion.service.js';
import DataTable from '../../components/common/DataTable.jsx';
import Field from '../../components/common/Field.jsx';
import Notice from '../../components/common/Notice.jsx';

export function EmpresasPage() {
  const { session, logout } = useAuth();
  const { busy, notice, run, setNotice } = useApiAction();
  const [rows, setRows] = useState([]);
  const [detail, setDetail] = useState(null);
  const [query, setQuery] = useState('');
  const appliedCompanySearch = useRef('');
  const [form, setForm] = useState({ nombre_empresa: '', sector_industria: '', sitio_web: '' });
  async function load(search = appliedCompanySearch.current) { const result = await run(() => listCompanies(session.token, { q: search })); if (result) { appliedCompanySearch.current = search; setRows(result); setQuery(''); } }
  useEffect(() => {
    let active = true;
    listCompanies(session.token).then((data) => { if (active) setRows(data); }).catch((cause) => { if (active) { if (cause.status === 401) logout(); setNotice({ type: 'error', text: cause.message }); } });
    return () => { active = false; };
  }, [session.token, logout, setNotice]);
  async function submit(event) {
    event.preventDefault();
    if (await run(() => createCompany(session.token, form))) {
      setForm({ nombre_empresa: '', sector_industria: '', sitio_web: '' });
      setDetail(null); await load();
    }
  }
  return <><div className="page-heading"><div><h1>Empresas</h1><p>Registra empresas y consulta sus clientes asociados.</p></div></div><Notice notice={notice} />
    <form className="form-card company-registration-form" onSubmit={submit}><div className="form-grid">{Object.keys(form).map((key) => <Field key={key} label={key.replaceAll('_', ' ')} required={key === 'nombre_empresa'} type={key === 'sitio_web' ? 'url' : 'text'} maxLength={key === 'nombre_empresa' ? 150 : key === 'sector_industria' ? 100 : 255} value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} />)}</div><div className="form-actions" style={{ marginTop: 16 }}><button className="button primary" disabled={busy}>Registrar empresa</button></div></form>
    <form className="client-search" onSubmit={(event) => { event.preventDefault(); setDetail(null); load(query); }}><SearchInput label="Buscar empresa" path="/empresas" kind="company" value={query} onChange={setQuery} onSelect={row => { setDetail(null); load(row.nombre_empresa); }} placeholder="Nombre de empresa" /><button className="button" disabled={busy}>Buscar</button></form>
    <DataTable rows={rows} actions={(row) => <button className="button action-button" disabled={busy} onClick={async () => { setDetail(null); const result = await run(() => getCompany(session.token, row.id_empresa)); if (result) setDetail(result); }}>Ver detalle</button>} />
    {detail && <section className="form-card"><h2>Detalle de empresa</h2><DataTable rows={[Object.fromEntries(Object.entries(detail).filter(([key]) => key !== 'clientes'))]} /><h3>Clientes asociados</h3><DataTable rows={detail.clientes || []} /></section>}
  </>;
}

const auditTables = ['empresas', 'clientes', 'vendedores', 'usuarios', 'productos', 'campanas_marketing', 'acciones_marketing', 'visitantes_web', 'actividad_web', 'ventas', 'descargas_prueba', 'asignaciones_crm', 'interacciones', 'detalle_ventas', 'auditoria_cambios', 'alertas', 'plantillas_correo', 'correos_enviados', 'salesforce_sincronizaciones'].map(value => ({ label: value, value }));

export function SeguimientoPage({ mode }) {
  const audit = mode === 'audit';
  const { session, logout } = useAuth();
  const { busy, notice, run, setNotice } = useApiAction();
  const [filters, setFilters] = useState({ tabla: '', desde: '', hasta: '', estado: '' });
  const appliedFilters = useRef({});
  const [result, setResult] = useState({ rows: [], count: 0 });
  const [page, setPage] = useState(1);
  const [clientId, setClientId] = useState('');
  const [limit, setLimit] = useState(10);
  async function load(nextPage = 1, commitFilters = false, chosenFilters) {
    const selectedFilters = chosenFilters || (commitFilters ? filters : appliedFilters.current);
    const allowed = audit ? ['tabla', 'desde', 'hasta'] : ['estado'];
    const params = Object.fromEntries(allowed.filter((key) => selectedFilters[key]).map((key) => [key, key === 'hasta' ? `${selectedFilters[key]}T23:59:59.999` : selectedFilters[key]]));
    const data = await run(() => (audit ? listAudit : listSyncs)(session.token, { ...params, page: nextPage, limit }));
    if (data) { appliedFilters.current = { ...selectedFilters }; setResult(data); setPage(nextPage); if (commitFilters) setFilters((current) => ({ ...current, [audit ? 'tabla' : 'estado']: '' })); }
  }
  useEffect(() => {
    let active = true;
    (audit ? listAudit : listSyncs)(session.token, { ...appliedFilters.current, page: 1, limit }).then((data) => { if (active) { setResult(data); setPage(1); } }).catch((cause) => { if (active) { if (cause.status === 401) logout(); setNotice({ type: 'error', text: cause.message }); } });
    return () => { active = false; };
  }, [session.token, audit, logout, setNotice, limit]);
  async function mutate(action) {
    const outcome = await run(action);
    // Refresh even after a failed sync: the backend records the failed attempt.
    try {
      const data = await listSyncs(session.token, { estado: appliedFilters.current.estado, page, limit });
      setResult(data);
    } catch (cause) { if (cause.status === 401) logout(); if (outcome) setNotice({ type: 'error', text: cause.message }); }
  }
  return <div className={audit ? undefined : 'salesforce-page'}><div className="page-heading"><div><h1>{audit ? 'Auditoría' : 'Salesforce'}</h1><p>{audit ? 'Consulta los cambios registrados en el CRM.' : 'Consulta el historial y gestiona la sincronización de clientes.'}</p></div></div><Notice notice={notice} />
    <form className={`form-card${audit ? ' audit-filter-form' : ' salesforce-filter-form'}`} onSubmit={(event) => { event.preventDefault(); load(1, true); }}><div className="form-grid">{audit ? <><Field label="Tabla"><SearchInput label="Buscar tabla" options={auditTables} kind="table" value={filters.tabla} onChange={tabla => setFilters(current => ({ ...current, tabla }))} onSelect={row => load(1, true, { ...filters, tabla: row.value })} placeholder="Nombre de tabla" /></Field><Field label="Desde" type="date" max={filters.hasta || undefined} value={filters.desde} onChange={(event) => setFilters({ ...filters, desde: event.target.value })} /><Field label="Hasta" type="date" min={filters.desde || undefined} value={filters.hasta} onChange={(event) => setFilters({ ...filters, hasta: event.target.value })} /></> : <Field label="Estado"><select value={filters.estado} onChange={(event) => setFilters({ ...filters, estado: event.target.value })}><option value="">Todos</option>{['Pendiente', 'Sincronizado', 'Fallido'].map((state) => <option key={state}>{state}</option>)}</select></Field>}</div><div className="form-actions" style={{ marginTop: 16 }}><button className="button primary" disabled={busy}>Consultar</button></div></form>
    {!audit && <form className="client-search salesforce-sync" onSubmit={(event) => { event.preventDefault(); mutate(() => syncClient(session.token, Number(clientId))); }}><Field label="ID del cliente" required type="number" min="1" step="1" value={clientId} onChange={(event) => setClientId(event.target.value)} /><button className="button primary" disabled={busy}>Sincronizar cliente</button></form>}
    <p aria-live="polite">{busy ? 'Consultando…' : `${result.count} registro(s)`}</p>
    <DataTable managed rows={result.rows} actions={audit ? undefined : (row) => row.estado === 'Fallido' && <button className="button action-button" disabled={busy} onClick={() => mutate(() => retrySync(session.token, row.id_sincronizacion))}>Reintentar</button>} />
    <TablePagination page={page} pages={Math.ceil(result.count / limit)} total={result.count} size={limit} onSize={(value) => { setPage(1); setLimit(value); }} onPage={load} disabled={busy} />
  </div>;
}
