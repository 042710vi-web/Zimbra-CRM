import { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth.js';
import { useApiAction } from '../../hooks/useApiAction.js';
import { createClient, listClients } from '../../services/clientes.service.js';
import Field from '../../components/common/Field.jsx';
import Notice from '../../components/common/Notice.jsx';

// HU-05: registrar nuevos clientes.
// Endpoint: POST /api/clients (consumido por clientes.service.js).
export default function ClientesPage({ onCreated }) {
  const { session, logout } = useAuth();
  const { busy, notice, run } = useApiAction();
  const [form, setForm] = useState({ nombre_completo: '', correo_electronico: '', telefono: '', nombre_empresa: '', sector_industria: '', sitio_web: '' });
  const [createdCount, setCreatedCount] = useState(0);
  const [clients, setClients] = useState([]);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1, limit: 10 });
  const [listBusy, setListBusy] = useState(true);
  const [listError, setListError] = useState('');

  async function refreshClients(nextPage = page, search = query) {
    setListBusy(true);
    setListError('');
    try {
      const result = await listClients(session.token, { page: nextPage, limit: 10, q: search });
      setClients(result.data);
      setPagination({ total: result.total, totalPages: result.totalPages, limit: result.limit });
      setPage(result.page);
    } catch (error) {
      if (error.status === 401) logout();
      setListError(error.message);
    } finally {
      setListBusy(false);
    }
  }

  useEffect(() => { refreshClients(1, ''); }, [session.token]);

  function set(key, value) { setForm((current) => ({ ...current, [key]: value })); }
  async function submit(event) {
    event.preventDefault();
    const result = await run(() => createClient(session.token, form));
    if (!result) return;
    setCreatedCount((count) => count + 1);
    onCreated?.(result.id_cliente);
    setForm({ nombre_completo: '', correo_electronico: '', telefono: '', nombre_empresa: '', sector_industria: '', sitio_web: '' });
    await refreshClients(1, query);
  }

  return <><div className="page-heading"><div><span className="eyebrow">PROSPECTOS</span><h1>Registrar cliente</h1><p>Añade una persona interesada al CRM.</p></div></div><Notice notice={notice} /><form className="form-card" onSubmit={submit}>
    <div className="form-section"><h3>Información de contacto</h3><p>Los campos con * son obligatorios.</p><div className="form-grid"><Field label="Nombre completo *" required value={form.nombre_completo} onChange={(event) => set('nombre_completo', event.target.value)} placeholder="Nombre y apellido" /><Field label="Correo electrónico *" type="email" required value={form.correo_electronico} onChange={(event) => set('correo_electronico', event.target.value)} placeholder="persona@empresa.com" /><Field label="Teléfono" value={form.telefono} onChange={(event) => set('telefono', event.target.value)} placeholder="+57 300 000 0000" /></div></div>
    <div className="form-section"><h3>Empresa <span className="optional">Opcional</span></h3><div className="form-grid"><Field label="Nombre de empresa" value={form.nombre_empresa} onChange={(event) => set('nombre_empresa', event.target.value)} placeholder="Empresa" /><Field label="Sector" value={form.sector_industria} onChange={(event) => set('sector_industria', event.target.value)} placeholder="Tecnología" /><Field label="Sitio web" type="url" value={form.sitio_web} onChange={(event) => set('sitio_web', event.target.value)} placeholder="https://empresa.com" /></div></div>
    <div className="form-actions"><span className="muted">{createdCount ? `${createdCount} cliente(s) creado(s) en esta sesión` : 'El registro queda disponible para pruebas y ventas.'}</span><button className="button primary" disabled={busy}>{busy ? 'Guardando…' : 'Guardar cliente'} <span>→</span></button></div>
  </form>
  <div className="section-title clients-list-heading"><div><h2>Clientes registrados</h2><p>{pagination.total} registro(s) encontrados</p></div></div>
  <section className="client-list-card" aria-label="Clientes registrados">
    <form className="client-search" onSubmit={(event) => { event.preventDefault(); refreshClients(1, query); }}>
      <input aria-label="Buscar clientes" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nombre, correo o empresa" />
      <button className="button primary" disabled={listBusy}>Buscar</button>
    </form>
    {listError && <div className="notice error" role="alert">{listError}</div>}
    <div className="client-table-wrap"><table className="client-table">
      <thead><tr><th>Cliente</th><th>Correo</th><th>Empresa</th><th>Estado</th><th>Puntaje</th></tr></thead>
      <tbody>{clients.map((client) => <tr key={client.id_cliente}>
        <td><strong>{client.nombre_completo}</strong><small>#{client.id_cliente}</small></td>
        <td>{client.correo_electronico}</td><td>{client.nombre_empresa || '—'}</td>
        <td><span className="client-status">{client.estado_cliente}</span></td><td>{client.puntaje_total ?? 0}</td>
      </tr>)}
      {!listBusy && clients.length === 0 && <tr><td className="client-empty" colSpan="5">No hay clientes que coincidan con la búsqueda.</td></tr>}
      {listBusy && <tr><td className="client-empty" colSpan="5">Cargando clientes…</td></tr>}
      </tbody>
    </table></div>
    <div className="client-pagination"><span>Página {page} de {pagination.totalPages}</span><div>
      <button className="button" disabled={listBusy || page <= 1} onClick={() => refreshClients(page - 1)}>Anterior</button>
      <button className="button" disabled={listBusy || page >= pagination.totalPages} onClick={() => refreshClients(page + 1)}>Siguiente</button>
    </div></div>
  </section></>;
}
