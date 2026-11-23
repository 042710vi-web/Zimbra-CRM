import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth.js';
import { useApiAction } from '../../hooks/useApiAction.js';
import { useModuleQuery } from '../../hooks/useModuleQuery.js';
import { useModuleFilters, useResetSelectsAfterQuery } from '../../hooks/useModuleFilters.js';
import { attendAlert } from '../../services/modulos.service.js';
import { formatDateTime } from '../../utils/formatters.js';
import { ClientLink, ModuleTable, PageHeading, Pagination, QueryError, Status } from '../../components/common/ModuleUI.jsx';
import AlertAttention from '../../components/common/AlertAttention.jsx';
import Notice from '../../components/common/Notice.jsx';

export default function AlertasPage() {
  const { session } = useAuth();
  const admin = session.user.role === 'Administrador';
  const search = useModuleFilters({ estado_alerta: 'Pendiente', tipo_alerta: '', id_vendedor: '' });
  const query = useModuleQuery('/alerts', { ...search.filters, ...(!admin ? { id_vendedor: '' } : {}), page: search.page, limit: search.limit }, { pollMs: 3000 });
  useResetSelectsAfterQuery(search, query, ['estado_alerta', 'tipo_alerta', 'id_vendedor']);
  const { busy, notice, run } = useApiAction();
  const [selected, setSelected] = useState(null);
  async function confirm(note) {
    if (await run(() => attendAlert(session.token, { id_alerta: selected.id_alerta, nota_atencion: note }))) { setSelected(null); query.reload(); }
  }
  return <><PageHeading title="Alertas comerciales">{admin ? 'Supervisa las alertas del equipo, incluidas las que aún no tienen vendedor.' : 'Consulta y atiende las alertas que te corresponden.'}</PageHeading><Notice notice={notice} /><p className="helper-copy">La lista se actualiza automáticamente cada 3 segundos. La atención conserva fecha, usuario y nota.</p>
    <form className="module-filters form-card" onSubmit={(event) => { search.apply(event); query.reload(); }}><label className="field">Estado<select value={search.draft.estado_alerta} onChange={(event) => search.setDraft({ ...search.draft, estado_alerta: event.target.value })}><option value="">Todos</option><option>Pendiente</option><option>Atendida</option></select></label><label className="field">Motivo<select value={search.draft.tipo_alerta} onChange={(event) => search.setDraft({ ...search.draft, tipo_alerta: event.target.value })}><option value="">Todos</option>{['Prospecto calificado', 'Retorno al sitio', 'Prueba por vencer', 'Prueba vencida'].map((type) => <option key={type}>{type}</option>)}</select></label>{admin && <label className="field">ID de vendedor<input type="number" min="1" step="1" value={search.draft.id_vendedor} onChange={(event) => search.setDraft({ ...search.draft, id_vendedor: event.target.value })} placeholder="Todo el equipo" /></label>}<button className="button primary">Filtrar</button><button className="button" type="button" onClick={search.reset}>Limpiar</button></form>
    <QueryError error={query.error} retry={query.reload} /><ModuleTable managed rows={query.data?.data || []} loading={query.loading} rowKey="id_alerta" rowClass={(row) => !row.id_vendedor && row.estado_alerta === 'Pendiente' ? 'urgent-row' : ''} columns={[{ key: 'tipo_alerta', label: 'Motivo' }, { key: 'nombre_completo', label: 'Cliente', render: (row) => <ClientLink id={row.id_cliente}>{row.nombre_completo}</ClientLink> }, { key: 'nombre_vendedor', label: 'Responsable', render: (row) => row.id_vendedor ? (row.nombre_vendedor || 'Vendedor asignado') : 'Sin asignar · Administración' }, { key: 'mensaje', label: 'Mensaje' }, { key: 'fecha_creacion', label: 'Creación', render: (row) => formatDateTime(row.fecha_creacion) }, { key: 'estado_alerta', label: 'Estado', render: (row) => <Status value={row.estado_alerta} /> }, { key: 'fecha_atencion', label: 'Atención', render: (row) => formatDateTime(row.fecha_atencion) }, { key: 'nota_atencion', label: 'Nota de atención' }, { key: 'actions', label: 'Acción', render: (row) => row.estado_alerta === 'Pendiente' ? <button className="button action-button" disabled={busy} onClick={() => setSelected(row)}>Atender</button> : 'Atendida' }]} /><Pagination size={search.limit} onSize={search.setLimit} result={query.data} page={search.page} onPage={search.setPage} disabled={query.loading} />
    {selected && <AlertAttention alert={selected} onClose={() => setSelected(null)} onConfirm={confirm} busy={busy} error={notice?.type === 'error' ? notice.text : ''} />}
  </>;
}
