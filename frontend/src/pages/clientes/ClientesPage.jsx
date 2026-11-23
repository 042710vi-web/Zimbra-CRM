import SearchInput from '../../components/common/SearchInput.jsx';
import PagedTable, { TablePagination } from '../../components/common/PagedTable.jsx';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../../hooks/useAuth.js';
import { useApiAction } from '../../hooks/useApiAction.js';
import { createClient, listClients, getClient, updateClient, changeClientStatus } from '../../services/clientes.service.js';
import Field from '../../components/common/Field.jsx';
import Notice from '../../components/common/Notice.jsx';

// HU-04: registrar nuevos clientes.
// Endpoint: POST /api/clients (consumido por clientes.service.js).
export default function ClientesPage({ onCreated }) {
  const { session, logout } = useAuth();
  const { busy, notice, run } = useApiAction();
  const [form, setForm] = useState({ nombre_completo: '', correo_electronico: '', telefono: '', nombre_empresa: '', sector_industria: '', sitio_web: '' });
  const [createdCount, setCreatedCount] = useState(0);
  const [editingId, setEditingId] = useState(null);
  const [selected, setSelected] = useState(null);
  const [nextStatus, setNextStatus] = useState('Frio');
  const [clients, setClients] = useState([]);
  const [query, setQuery] = useState('');
  const appliedSearch = useRef('');
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1, limit: 10 });
  const [listBusy, setListBusy] = useState(true);
  const [listError, setListError] = useState('');

  const refreshClients = useCallback(async (nextPage, search) => {
    appliedSearch.current = search;
    setListBusy(true);
    setListError('');
    try {
      const result = await listClients(session.token, { page: nextPage, limit: size, q: search });
      setClients(result.data);
      setPagination({ total: result.total, totalPages: result.totalPages, limit: result.limit });
      setPage(result.page);
      return true;
    } catch (error) {
      if (error.status === 401) logout();
      setListError(error.message);
      return false;
    } finally {
      setListBusy(false);
    }
  }, [session.token, logout, size]);

  useEffect(() => { refreshClients(1, appliedSearch.current); }, [refreshClients]);

  async function searchClients(value) {
    if (await refreshClients(1, value)) setQuery('');
  }

  function set(key, value) { setForm((current) => ({ ...current, [key]: value })); }
  function resetForm() {
    setEditingId(null);
    setForm({ nombre_completo: '', correo_electronico: '', telefono: '', nombre_empresa: '', sector_industria: '', sitio_web: '' });
  }
  async function edit(client) {
    const detail = await run(() => getClient(session.token, client.id_cliente));
    if (!detail) return;
    setEditingId(detail.id_cliente);
    setForm(Object.fromEntries(['nombre_completo', 'correo_electronico', 'telefono', 'nombre_empresa', 'sector_industria', 'sitio_web'].map((key) => [key, detail[key] || ''])));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  async function saveStatus(event) {
    event.preventDefault();
    const result = await run(() => changeClientStatus(session.token, selected.id_cliente, nextStatus));
    if (result) { setSelected(null); await refreshClients(page, appliedSearch.current); }
  }
  async function submit(event) {
    event.preventDefault();
    const result = await run(() => editingId ? updateClient(session.token, { ...form, id_cliente: editingId }) : createClient(session.token, form));
    if (!result) return;
    if (!editingId) { setCreatedCount((count) => count + 1); onCreated?.(result.id_cliente); }
    resetForm();
    await refreshClients(1, appliedSearch.current);
  }

  return <><div className="page-heading"><div><span className="eyebrow">PROSPECTOS</span><h1>{editingId ? `Editar cliente #${editingId}` : 'Registrar cliente'}</h1><p>Añade una persona interesada al CRM o actualiza sus datos.</p></div></div><Notice notice={notice} />{editingId && <button className="button action-button" disabled={busy} onClick={resetForm}>Cancelar edición</button>}<form className="form-card" onSubmit={submit}>
    <div className="form-section"><h3>Información de contacto</h3><p>Los campos con * son obligatorios.</p><div className="form-grid"><Field label="Nombre completo *" required value={form.nombre_completo} onChange={(event) => set('nombre_completo', event.target.value)} placeholder="Nombre y apellido" /><Field label="Correo electrónico *" type="email" required value={form.correo_electronico} onChange={(event) => set('correo_electronico', event.target.value)} placeholder="persona@empresa.com" /><Field label="Teléfono" value={form.telefono} onChange={(event) => set('telefono', event.target.value)} placeholder="+57 300 000 0000" /></div></div>
    <div className="form-section"><h3>Empresa <span className="optional">Opcional</span></h3><div className="form-grid"><Field label="Nombre de empresa" value={form.nombre_empresa} onChange={(event) => set('nombre_empresa', event.target.value)} placeholder="Empresa" /><Field label="Sector" value={form.sector_industria} onChange={(event) => set('sector_industria', event.target.value)} placeholder="Tecnología" /><Field label="Sitio web" type="url" value={form.sitio_web} onChange={(event) => set('sitio_web', event.target.value)} placeholder="https://empresa.com" /></div></div>
    <div className="form-actions"><span className="muted">{createdCount ? `${createdCount} cliente(s) creado(s) en esta sesión` : 'El registro queda disponible para pruebas y ventas.'}</span><button className="button primary" disabled={busy}>{busy ? 'Guardando…' : 'Guardar cliente'} <span>→</span></button></div>
  </form>
  <div className="section-title clients-list-heading"><div><h2>Clientes registrados</h2><p>{pagination.total} registro(s) encontrados</p></div></div>
  <section className="client-list-card" aria-label="Clientes registrados">
    <form className="client-search" onSubmit={(event) => { event.preventDefault(); searchClients(query.trim()); }}>
      <SearchInput label="Buscar clientes" path="/clients" value={query} onChange={setQuery} onSelect={client => searchClients(client.correo_electronico)} placeholder="Buscar por nombre, correo o empresa" />
      <button className="button primary" disabled={listBusy}>Buscar</button>
    </form>
    {listError && <div className="notice error" role="alert">{listError}</div>}
    <div className="client-table-wrap"><PagedTable managed className="client-table balanced-table balanced-actions-table">
      <thead><tr><th>Cliente</th><th>Correo</th><th>Empresa</th><th>Estado</th><th>Puntaje</th><th>Acciones</th></tr></thead>
      <tbody>{clients.map((client) => <tr key={client.id_cliente}>
        <td><strong>{client.nombre_completo}</strong><small>#{client.id_cliente}</small></td>
        <td>{client.correo_electronico}</td><td>{client.nombre_empresa || '—'}</td>
        <td><span className="client-status">{client.estado_cliente}</span></td><td>{client.puntaje_total ?? 0}</td>
        <td><button className="button action-button" disabled={busy} onClick={() => edit(client)}>Editar</button> <button className="button" disabled={busy} onClick={() => { setSelected(client); setNextStatus(client.estado_cliente); }}>Cambiar estado</button></td>
      </tr>)}
      {!listBusy && clients.length === 0 && <tr><td className="client-empty" colSpan="6">No hay clientes que coincidan con la búsqueda.</td></tr>}
      {listBusy && <tr><td className="client-empty" colSpan="6">Cargando clientes…</td></tr>}
      </tbody>
    </PagedTable></div>
    <TablePagination page={page} pages={pagination.totalPages} total={pagination.total} size={size} onSize={(value) => { setPage(1); setSize(value); }} onPage={(next) => refreshClients(next, appliedSearch.current)} disabled={listBusy} />
  </section>{selected && <form className="form-card" onSubmit={saveStatus}><h2>Estado de {selected.nombre_completo}</h2><Field label="Nuevo estado"><select value={nextStatus} onChange={(event) => setNextStatus(event.target.value)}>{['Frio', 'Tibio', 'Calificado', 'En Negociacion', 'Cliente', 'Convertido', 'Descartado', 'Inactivo'].map((state) => <option key={state}>{state}</option>)}</select></Field><p>Al calificar o convertir un cliente, el sistema intentará sincronizarlo con Salesforce.</p><div className="form-actions"><button type="button" className="button action-button" disabled={busy} onClick={() => setSelected(null)}>Cancelar</button><button className="button primary" disabled={busy}>Guardar estado</button></div></form>}</>;
}
