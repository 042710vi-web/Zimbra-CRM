import { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth.js';
import { createInteraction, getTimeline, listInteractions, updateInteraction } from '../../services/interacciones.service.js';

export default function InteraccionesPage() {
  const { session } = useAuth();
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ id_asignacion: '', tipo_interaccion: 'Llamada', resultado: '', notas: '' });
  const [clientId, setClientId] = useState(''); const [timeline, setTimeline] = useState([]);

  async function load(page = 1) {
    setBusy(true); setError('');
    try {
      const result = await listInteractions(session.token, { page, limit: 20 });
      setRows(result.data || []); setPagination(result.pagination || { page, pages: 1, total: 0 });
    } catch (cause) { setError(cause.message); }
    finally { setBusy(false); }
  }

  useEffect(() => { load(); }, [session.token]);
  async function submit(event) { event.preventDefault(); try { await createInteraction(session.token, { ...form, id_asignacion: Number(form.id_asignacion) }); setForm({ id_asignacion: '', tipo_interaccion: 'Llamada', resultado: '', notas: '' }); await load(); } catch (cause) { setError(cause.message); } }
  async function showTimeline(event) { event.preventDefault(); try { const result = await getTimeline(session.token, Number(clientId)); setTimeline(result.data || []); } catch (cause) { setError(cause.message); } }
  async function edit(row) { const tipo_interaccion = window.prompt('Tipo: Llamada, Correo o Meeting', row.tipo_interaccion); if (tipo_interaccion === null) return; const notas = window.prompt('Editar notas de la interacción', row.notas || ''); if (notas === null) return; try { await updateInteraction(session.token, { id_interaccion: row.id_interaccion, tipo_interaccion, notas }); await load(pagination.page); } catch (cause) { setError(cause.message); } }
  return <>
    <div className="page-heading"><div><span className="eyebrow">SEGUIMIENTO COMERCIAL</span><h1>Interacciones</h1><p>Historial de llamadas, correos, reuniones y alertas.</p></div><span className="count-chip">{pagination.total} registros</span></div>
    {error && <div className="notice error" role="alert">{error}</div>}
    <form className="form-card" onSubmit={submit}><h2>Registrar interacción</h2><label className="field">ID de asignación<input type="number" min="1" required value={form.id_asignacion} onChange={(e) => setForm({ ...form, id_asignacion: e.target.value })} /></label><label className="field">Tipo<select value={form.tipo_interaccion} onChange={(e) => setForm({ ...form, tipo_interaccion: e.target.value })}><option>Llamada</option><option>Correo</option><option>Meeting</option></select></label><label className="field">Resultado<input required value={form.resultado} onChange={(e) => setForm({ ...form, resultado: e.target.value })} /></label><label className="field">Notas<input value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} /></label><button className="button primary">Guardar interacción</button></form>
    <form className="form-card" onSubmit={showTimeline}><h2>Línea de tiempo del cliente</h2><label className="field">ID de cliente<input type="number" min="1" required value={clientId} onChange={(e) => setClientId(e.target.value)} /></label><button className="button">Consultar historial</button>{timeline.map((item, index) => <p key={`${item.tipo_evento}-${index}`}>{item.fecha_evento && new Date(item.fecha_evento).toLocaleString()} · {item.tipo_evento}: {item.descripcion}</p>)}</form>
    <section className="client-list-card"><div className="client-table-wrap"><table className="client-table"><thead><tr><th>Interacción</th><th>Asignación</th><th>Tipo</th><th>Resultado</th><th>Notas</th><th>Fecha</th><th>Acciones</th></tr></thead><tbody>
      {rows.map((row) => <tr key={row.id_interaccion}><td>#{row.id_interaccion}</td><td>#{row.id_asignacion}</td><td>{row.tipo_interaccion}</td><td>{row.resultado || '—'}</td><td>{row.notas || '—'}</td><td>{row.fecha_interaccion ? new Date(row.fecha_interaccion).toLocaleString() : '—'}</td><td><button className="button" onClick={() => edit(row)}>Editar notas</button></td></tr>)}
      {!busy && rows.length === 0 && <tr><td colSpan="7" className="client-empty">No hay interacciones para mostrar.</td></tr>}
      {busy && <tr><td colSpan="7" className="client-empty">Cargando interacciones…</td></tr>}
    </tbody></table></div><div className="client-pagination"><span>Página {pagination.page} de {pagination.pages}</span><div><button className="button" disabled={busy || pagination.page <= 1} onClick={() => load(pagination.page - 1)}>Anterior</button><button className="button" disabled={busy || pagination.page >= pagination.pages} onClick={() => load(pagination.page + 1)}>Siguiente</button></div></div></section>
  </>;
}
