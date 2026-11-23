import SearchInput from '../../components/common/SearchInput.jsx';
import DismissiblePanel from '../../components/common/DismissiblePanel.jsx';
import PagedTable, { TablePagination } from '../../components/common/PagedTable.jsx';
import { formatMoneyInText, formatDateTime } from '../../utils/formatters.js';
import { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth.js';
import { createInteraction, getTimeline, listInteractions, updateInteraction } from '../../services/interacciones.service.js';

export default function InteraccionesPage() {
  const { session } = useAuth();
  const [rows, setRows] = useState([]);
  const [size, setSize] = useState(10);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ id_asignacion: '', tipo_interaccion: '', resultado: '', notas: '' });
  const [clientSearch, setClientSearch] = useState('');
  const [clientId, setClientId] = useState(''); const [timeline, setTimeline] = useState([]);

  async function load(page = 1) {
    setBusy(true); setError('');
    try {
      const result = await listInteractions(session.token, { page, limit: size });
      setRows(result.data || []); setPagination(result.pagination || { page, pages: 1, total: 0 });
    } catch (cause) { setError(cause.message); }
    finally { setBusy(false); }
  }

  useEffect(() => { load(); }, [session.token, size]);
  async function submit(event) { event.preventDefault(); try { await createInteraction(session.token, { ...form, id_asignacion: Number(form.id_asignacion) }); setForm({ id_asignacion: '', tipo_interaccion: '', resultado: '', notas: '' }); await load(); } catch (cause) { setError(cause.message); } }
  async function showTimeline(event, selectedId = clientId) { event?.preventDefault(); try { const result = await getTimeline(session.token, Number(selectedId)); setTimeline(result.data || []); setClientSearch(''); } catch (cause) { setError(cause.message); } }
  async function edit(row) { const tipo_interaccion = window.prompt('Tipo: Llamada, Correo o Meeting', row.tipo_interaccion); if (tipo_interaccion === null) return; const notas = window.prompt('Editar notas de la interacción', row.notas || ''); if (notas === null) return; try { await updateInteraction(session.token, { id_interaccion: row.id_interaccion, tipo_interaccion, notas }); await load(pagination.page); } catch (cause) { setError(cause.message); } }
  return <>
    <div className="page-heading"><div><span className="eyebrow">SEGUIMIENTO COMERCIAL</span><h1>Interacciones</h1><p>Historial de llamadas, correos, reuniones y alertas.</p></div><span className="count-chip">{pagination.total} registros</span></div>
    {error && <DismissiblePanel as="div" noticeKey={error} onClose={() => setError('')} className="notice error" role="alert">{error}</DismissiblePanel>}
    <form className="form-card" onSubmit={submit}><h2>Registrar interacción</h2><label className="field">ID de asignación<input type="number" min="1" required value={form.id_asignacion} onChange={(e) => setForm({ ...form, id_asignacion: e.target.value })} /></label><label className="field">Tipo<select required value={form.tipo_interaccion} onChange={(e) => setForm({ ...form, tipo_interaccion: e.target.value })}><option value="">Selecciona un tipo</option><option>Llamada</option><option>Correo</option><option>Meeting</option></select></label><label className="field">Resultado<input required value={form.resultado} onChange={(e) => setForm({ ...form, resultado: e.target.value })} /></label><label className="field">Notas<input value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} /></label><button className="button primary">Guardar interacción</button></form>
    <form className="form-card client-timeline-form" onSubmit={showTimeline}><h2>Línea de tiempo del cliente</h2><label className="field">Buscar cliente<SearchInput label="Buscar cliente para historial" path="/clients" value={clientSearch} onChange={value => { setClientSearch(value); setClientId(/^\d+$/.test(value) ? value : ''); }} onSelect={row => { setClientId(String(row.id_cliente)); showTimeline(undefined, row.id_cliente); }} placeholder="Nombre, correo o ID" /></label><button className="button">Consultar historial</button>{timeline.map((item, index) => <p key={`${item.tipo_evento}-${index}`}>{formatDateTime(item.fecha_evento)} · {item.tipo_evento}: {formatMoneyInText(item.descripcion)}</p>)}</form>
    <section className="client-list-card"><div className="client-table-wrap"><PagedTable managed className="client-table"><thead><tr><th>Interacción</th><th>Asignación</th><th>Tipo</th><th>Resultado</th><th>Notas</th><th>Fecha</th><th>Acciones</th></tr></thead><tbody>
      {rows.map((row) => <tr key={row.id_interaccion}><td>#{row.id_interaccion}</td><td>#{row.id_asignacion}</td><td>{row.tipo_interaccion}</td><td>{row.resultado || '—'}</td><td>{row.notas || '—'}</td><td>{formatDateTime(row.fecha_interaccion)}</td><td><button className="button action-button" onClick={() => edit(row)}>Editar notas</button></td></tr>)}
      {!busy && rows.length === 0 && <tr><td colSpan="7" className="client-empty">No hay interacciones para mostrar.</td></tr>}
      {busy && <tr><td colSpan="7" className="client-empty">Cargando interacciones…</td></tr>}
    </tbody></PagedTable></div><TablePagination page={pagination.page} pages={pagination.pages} total={pagination.total} size={size} onSize={setSize} onPage={load} disabled={busy} /></section>
  </>;
}
