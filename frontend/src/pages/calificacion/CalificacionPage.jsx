import SearchInput from '../../components/common/SearchInput.jsx';
import DismissiblePanel from '../../components/common/DismissiblePanel.jsx';
import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth.js';
import { useApiAction } from '../../hooks/useApiAction.js';
import { useModuleQuery } from '../../hooks/useModuleQuery.js';
import { useModuleFilters, useResetSelectsAfterQuery } from '../../hooks/useModuleFilters.js';
import { saveModule } from '../../services/modulos.service.js';
import { ActionDialog, ClientLink, ModuleTable, PageHeading, Pagination, QueryError, Score, Status } from '../../components/common/ModuleUI.jsx';
import Notice from '../../components/common/Notice.jsx';

export default function CalificacionPage() {
  const { session } = useAuth();
  const search = useModuleFilters({ q: '', estado: '' });
  const query = useModuleQuery('/clients', { ...search.filters, page: search.page, limit: search.limit });
  useResetSelectsAfterQuery(search, query, ['q', 'estado']);
  const { busy, notice, run } = useApiAction();
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState(null);
  async function recalculate() {
    const data = await run(() => saveModule(session.token, '/scoring/recalificar', {}));
    if (data) { setResult(data); setConfirming(false); query.reload(); }
  }
  return <><PageHeading title="Calificación de prospectos" actions={<button className="button primary" disabled={busy} onClick={() => setConfirming(true)}>Recalcular puntajes</button>}>Supervisa los puntos y la clasificación automática calculados por el backend.</PageHeading><Notice notice={notice} /><div className="threshold-grid"><article><Status value="Frio" /><strong>Menos de 30 puntos</strong></article><article><Status value="Tibio" /><strong>Entre 30 y 69 puntos</strong></article><article><Status value="Calificado" /><strong>70 puntos o más</strong></article></div><p className="helper-copy">El estado comercial y las transiciones se muestran tal como los devuelve el servidor. El historial permite conocer qué acciones generaron los puntos.</p>
    {result && <DismissiblePanel as="div" noticeKey={result} onClose={() => setResult(null)} className="notice info" role="status">Clientes revisados: {result.clientes_revisados ?? 0}. Actualizados: {result.clientes_actualizados ?? 0}. Nuevos calificados: {result.prospectos_calificados?.length ?? 0}.</DismissiblePanel>}
    <form className="module-filters form-card" onSubmit={(event) => { search.apply(event); query.reload(); }}><label className="field">Buscar cliente<SearchInput label="Buscar cliente" path="/clients" params={{ estado: search.draft.estado }} value={search.draft.q} onChange={q => search.setDraft(current => ({ ...current, q }))} onSelect={row => { search.apply(undefined, { ...search.draft, q: row.correo_electronico }, ['q']); query.reload(); }} placeholder="Nombre o correo" /></label><label className="field">Estado<select value={search.draft.estado} onChange={(event) => search.setDraft({ ...search.draft, estado: event.target.value })}><option value="">Todos</option>{['Frio', 'Tibio', 'Calificado', 'En Negociacion', 'Cliente', 'Convertido', 'Descartado', 'Inactivo'].map((state) => <option key={state}>{state}</option>)}</select></label><button className="button primary">Filtrar</button><button className="button" type="button" onClick={search.reset}>Limpiar</button></form>
    <QueryError error={query.error} retry={query.reload} /><ModuleTable managed tableClassName="balanced-table qualification-table" rows={query.data?.data || []} loading={query.loading} rowKey="id_cliente" columns={[{ key: 'nombre_completo', label: 'Cliente', render: (row) => <ClientLink id={row.id_cliente}>{row.nombre_completo}</ClientLink> }, { key: 'correo_electronico', label: 'Correo' }, { key: 'nombre_empresa', label: 'Empresa' }, { key: 'puntaje_total', label: 'Puntaje', render: (row) => <Score value={row.puntaje_total} /> }, { key: 'estado_cliente', label: 'Estado', render: (row) => <Status value={row.estado_cliente} /> }]} /><Pagination size={search.limit} onSize={search.setLimit} result={query.data} page={search.page} onPage={search.setPage} disabled={query.loading} />
    {confirming && <ActionDialog title="Recalcular calificación" onClose={() => setConfirming(false)} onSubmit={recalculate} busy={busy} error={notice?.type === 'error' ? notice.text : ''}><p>El backend reconstruirá los puntajes y estados a partir de la actividad histórica y generará las alertas que correspondan. Inactivo y Convertido quedan excluidos y conservan sus puntajes. Los demás estados acumulan puntos y conservan su estado comercial cuando corresponde.</p></ActionDialog>}
  </>;
}
