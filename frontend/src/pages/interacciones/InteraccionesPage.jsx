import { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth.js';
import { listInteractions } from '../../services/interacciones.service.js';

export default function InteraccionesPage() {
  const { session } = useAuth();
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');

  async function load(page = 1) {
    setBusy(true); setError('');
    try {
      const result = await listInteractions(session.token, { page, limit: 20 });
      setRows(result.data || []); setPagination(result.pagination || { page, pages: 1, total: 0 });
    } catch (cause) { setError(cause.message); }
    finally { setBusy(false); }
  }

  useEffect(() => { load(); }, [session.token]);
  return <>
    <div className="page-heading"><div><span className="eyebrow">SEGUIMIENTO COMERCIAL</span><h1>Interacciones</h1><p>Historial de llamadas, correos, reuniones y alertas.</p></div><span className="count-chip">{pagination.total} registros</span></div>
    {error && <div className="notice error" role="alert">{error}</div>}
    <section className="client-list-card"><div className="client-table-wrap"><table className="client-table"><thead><tr><th>Interacción</th><th>Asignación</th><th>Tipo</th><th>Resultado</th><th>Notas</th><th>Fecha</th></tr></thead><tbody>
      {rows.map((row) => <tr key={row.id_interaccion}><td>#{row.id_interaccion}</td><td>#{row.id_asignacion}</td><td>{row.tipo_interaccion}</td><td>{row.resultado || '—'}</td><td>{row.notas || '—'}</td><td>{row.fecha_interaccion ? new Date(row.fecha_interaccion).toLocaleString() : '—'}</td></tr>)}
      {!busy && rows.length === 0 && <tr><td colSpan="6" className="client-empty">No hay interacciones para mostrar.</td></tr>}
      {busy && <tr><td colSpan="6" className="client-empty">Cargando interacciones…</td></tr>}
    </tbody></table></div><div className="client-pagination"><span>Página {pagination.page} de {pagination.pages}</span><div><button className="button" disabled={busy || pagination.page <= 1} onClick={() => load(pagination.page - 1)}>Anterior</button><button className="button" disabled={busy || pagination.page >= pagination.pages} onClick={() => load(pagination.page + 1)}>Siguiente</button></div></div></section>
  </>;
}
