import DismissiblePanel from '../../components/common/DismissiblePanel.jsx';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import { useApiAction } from '../../hooks/useApiAction.js';
import { useModuleQuery } from '../../hooks/useModuleQuery.js';
import { useModuleFilters, useResetSelectsAfterQuery } from '../../hooks/useModuleFilters.js';
import { saveModule } from '../../services/modulos.service.js';
import { formatDateTime } from '../../utils/formatters.js';
import { ClientLookup, ModuleTable, PageHeading, Pagination, QueryError, Score, Status } from '../../components/common/ModuleUI.jsx';
import Notice from '../../components/common/Notice.jsx';

export default function ActividadPage() {
  const { session } = useAuth();
  const admin = session.user.role === 'Administrador';
  const navigate = useNavigate();
  const search = useModuleFilters({ id_cliente: '' });
  const history = useModuleQuery(search.filters.id_cliente ? `/clients/${search.filters.id_cliente}/activities` : null, { page: search.page, limit: search.limit }, { enabled: !!search.filters.id_cliente });
  useResetSelectsAfterQuery(search, history, ['id_cliente']);
  const client = useModuleQuery('/clients/detalle', { id_cliente: search.filters.id_cliente }, { enabled: !!search.filters.id_cliente && admin });
  const actions = useModuleQuery('/actions', { estado: true }, { all: true, enabled: admin });
  const campaigns = useModuleQuery('/campaigns', { estado: 'Activa' }, { all: true, enabled: admin });
  const { busy, notice, run } = useApiAction();
  const [anonymous, setAnonymous] = useState(false);
  const [form, setForm] = useState({ id_cliente: search.filters.id_cliente, clave_rastreo: '', id_accion: '', id_campana: '', detalle: '' });
  const [result, setResult] = useState(null);
  const [identity, setIdentity] = useState({ nombre_completo: '', correo_electronico: '', telefono: '', nombre_empresa: '' });
  const [identifying, setIdentifying] = useState(false);
  async function submit(event) {
    event.preventDefault();
    setResult(null); setIdentifying(false);
    const body = { id_accion: Number(form.id_accion), id_campana: form.id_campana ? Number(form.id_campana) : null, direccion_origen: 'Simulación desde CRM', detalle: form.detalle || 'Evento de demostración registrado desde el CRM', ...(anonymous ? { clave_rastreo: form.clave_rastreo.trim() } : { id_cliente: Number(form.id_cliente) }) };
    const saved = await run(() => saveModule(session.token, '/activities', body));
    if (saved) { setForm((current) => ({ ...current, id_cliente: '', id_accion: '', id_campana: '', detalle: '' })); setResult(saved); history.reload(); client.reload(); }
  }
  async function identify(event) {
    event.preventDefault();
    const saved = await run(() => saveModule(session.token, '/public/leads', { ...identity, clave_rastreo: result.clave_rastreo }));
    if (saved) { setIdentifying(false); setAnonymous(false); setForm((current) => ({ ...current, id_cliente: '', id_accion: '', id_campana: '', detalle: '' })); setResult(null); navigate(`/actividad?id_cliente=${saved.id_cliente}`); history.reload(); client.reload(); }
  }
  return <><PageHeading title="Actividad web">Consulta las acciones registradas y su efecto en la calificación del cliente.</PageHeading><Notice notice={notice} />
    <form className="form-card activity-history-form" onSubmit={(event) => { search.apply(event); history.reload(); }}><h2>Historial por cliente</h2><ClientLookup required value={search.draft.id_cliente} onChange={(value) => search.setDraft({ id_cliente: value })} /><div className="form-actions" style={{ marginTop: 16 }}><button className="button primary">Consultar historial</button></div></form>
    {client.data && <div className="report-metrics"><article className="report-metric"><span>{client.data.nombre_completo}</span><Score value={client.data.puntaje_total} /></article><article className="report-metric"><span>Estado actual</span><Status value={client.data.estado_cliente} /></article></div>}
    <QueryError error={history.error || client.error} retry={() => { history.reload(); client.reload(); }} />
    {search.filters.id_cliente ? <><ModuleTable managed rowKey="id_actividad" loading={history.loading} rows={history.data?.data || []} columns={[{ key: 'fecha_actividad', label: 'Fecha y hora', render: (row) => formatDateTime(row.fecha_actividad) }, { key: 'nombre_accion', label: 'Acción' }, { key: 'nombre_campana', label: 'Campaña' }, { key: 'puntaje_otorgado', label: 'Puntos otorgados' }, { key: 'es_retorno', label: 'Retorno de calificado', render: (row) => row.es_retorno ? 'Sí' : 'No' }, { key: 'direccion_origen', label: 'Origen' }, { key: 'detalle', label: 'Detalle' }]} /><Pagination size={search.limit} onSize={search.setLimit} result={history.data} page={search.page} onPage={search.setPage} disabled={history.loading} /></> : <p className="notice info">Selecciona un cliente para ver su actividad en orden cronológico inverso.</p>}
    {admin && <><section className="form-card web-event-card"><h2>Demostrar un evento web</h2><p className="helper-copy">Representa una acción del sitio público. La fecha, los puntos, el estado y las alertas se calculan en el servidor; el evento queda identificado como una demostración.</p><form className="web-event-form" onSubmit={submit}><div className="segmented-control"><label><input type="radio" name="identity" checked={!anonymous} onChange={() => setAnonymous(false)} /> Cliente identificado</label><label><input type="radio" name="identity" checked={anonymous} onChange={() => setAnonymous(true)} /> Visitante anónimo</label></div><div className="form-grid">{anonymous ? <label className="field">Clave del visitante *<input required maxLength={100} value={form.clave_rastreo} onChange={(event) => setForm({ ...form, clave_rastreo: event.target.value })} placeholder="Ej. visitante-demostracion-01" /></label> : <ClientLookup required excludeInactive value={form.id_cliente} onChange={(value) => setForm({ ...form, id_cliente: value })} />}
      <label className="field">Acción *<select required value={form.id_accion} onChange={(event) => setForm({ ...form, id_accion: event.target.value })}><option value="">Selecciona una acción</option>{(actions.data || []).map((action) => <option key={action.id_accion} value={action.id_accion}>{action.nombre_accion} · {action.puntaje} pts</option>)}</select></label><label className="field">Campaña opcional<select value={form.id_campana} onChange={(event) => setForm({ ...form, id_campana: event.target.value })}><option value="">Sin campaña</option>{(campaigns.data || []).map((campaign) => <option key={campaign.id_campana} value={campaign.id_campana}>{campaign.nombre_campana}</option>)}</select></label><label className="field">Detalle opcional<textarea rows={3} maxLength={255} value={form.detalle} onChange={(event) => setForm({ ...form, detalle: event.target.value })} /></label></div><QueryError error={actions.error || campaigns.error} retry={() => { actions.reload(); campaigns.reload(); }} /><div className="form-actions" style={{ marginTop: 16 }}><button className="button primary" disabled={busy || actions.loading || !!actions.error || !actions.data?.length}>{busy ? 'Registrando…' : 'Registrar evento de demostración'}</button></div></form></section>
      {result && <DismissiblePanel noticeKey={result} onClose={() => { setResult(null); setIdentifying(false); }} className="form-card result-card" aria-live="polite"><h2>Evento #{result.id_actividad}</h2>{result.pendiente_identificacion ? <><p>El visitante aún es anónimo. Sus eventos quedan pendientes de vincularse a un cliente.</p><button className="button" onClick={() => setIdentifying((current) => !current)}>Identificar visitante</button></> : <><p>Cliente #{result.id_cliente} · Puntos agregados: <strong>{result.puntos_agregados}</strong> · Estado: <Status value={result.estado_cliente} /></p><p>Alerta de calificación: {result.alerta_calificacion ? 'Sí' : 'No'} · Retorno al sitio: {result.es_retorno ? 'Sí' : 'No'}</p><button className="button" onClick={() => { navigate(`/actividad?id_cliente=${result.id_cliente}`); history.reload(); client.reload(); }}>Ver historial de este cliente</button></>}
        {identifying && result.pendiente_identificacion && <form onSubmit={identify}><h3>Identificar visitante {result.clave_rastreo}</h3><p className="helper-copy">Se crea el cliente o se actualizan sus datos si el correo ya existe, y el servidor vincula sus eventos anteriores.</p><div className="form-grid"><label className="field">Nombre completo *<input required maxLength={150} value={identity.nombre_completo} onChange={(event) => setIdentity({ ...identity, nombre_completo: event.target.value })} /></label><label className="field">Correo *<input required type="email" maxLength={100} value={identity.correo_electronico} onChange={(event) => setIdentity({ ...identity, correo_electronico: event.target.value })} /></label><label className="field">Teléfono opcional<input type="tel" minLength={6} maxLength={50} value={identity.telefono} onChange={(event) => setIdentity({ ...identity, telefono: event.target.value })} /></label><label className="field">Empresa opcional<input maxLength={150} value={identity.nombre_empresa} onChange={(event) => setIdentity({ ...identity, nombre_empresa: event.target.value })} /></label></div><div className="form-actions"><button className="button primary" disabled={busy}>Vincular eventos al cliente</button></div></form>}
      </DismissiblePanel>}
    </>}
  </>;
}
