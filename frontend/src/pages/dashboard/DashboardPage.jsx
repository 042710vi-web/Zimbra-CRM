import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import { useApiAction } from '../../hooks/useApiAction.js';
import { useModuleQuery } from '../../hooks/useModuleQuery.js';
import { useModuleFilters, useResetSelectsAfterQuery } from '../../hooks/useModuleFilters.js';
import { attendAlert } from '../../services/modulos.service.js';
import { formatDate, formatDateTime, formatMoney } from '../../utils/formatters.js';
import { ClientLink, ModuleTable, PageHeading, QueryError, Score } from '../../components/common/ModuleUI.jsx';
import AlertAttention from '../../components/common/AlertAttention.jsx';
import Notice from '../../components/common/Notice.jsx';

const money = formatMoney;
export default function DashboardPage() {
  const { session } = useAuth();
  const firstName = session.user.name?.trim().split(/\s+/)[0] || 'bienvenido';
  const admin = session.user.role === 'Administrador';
  const search = useModuleFilters({ id_vendedor: '' });
  const query = useModuleQuery('/dashboard', admin ? search.filters : {}, { pollMs: 3000 });
  useResetSelectsAfterQuery(search, query, ['id_vendedor']);
  const vendors = useModuleQuery('/vendors', {}, { all: true, enabled: admin });
  const { busy, notice, run } = useApiAction();
  const [selected, setSelected] = useState(null);
  const updatedAt = useMemo(() => query.data ? formatDateTime(new Date()) : '', [query.data]);
  const summary = query.data;
  const qualified = summary?.prospectos_calificados || [];
  const unassigned = qualified.filter((row) => !row.id_vendedor);
  const assigned = admin ? qualified.filter((row) => row.id_vendedor) : qualified;
  const alerts = summary?.alertas_pendientes || [];
  async function confirm(note) {
    if (await run(() => attendAlert(session.token, { id_alerta: selected.id_alerta, nota_atencion: note }))) { setSelected(null); query.reload(); }
  }
  return <><PageHeading title={`Hola, ${firstName}`} actions={<button className="button" disabled={query.loading} onClick={query.reload}>Actualizar panel</button>}>{admin ? 'Vista consolidada del equipo y prospectos por asignar.' : 'Tus prospectos calificados, alertas y oportunidades pendientes.'}</PageHeading><Notice notice={notice} />
    {admin && <form className="module-filters form-card" onSubmit={(event) => { search.apply(event); query.reload(); }}><label className="field">Vista del equipo<select value={search.draft.id_vendedor} onChange={(event) => search.setDraft({ id_vendedor: event.target.value })}><option value="">Todo el equipo y sin asignar</option>{(vendors.data || []).map((vendor) => <option value={vendor.id_vendedor} key={vendor.id_vendedor}>{vendor.nombre_vendedor}</option>)}</select></label><button className="button primary">Aplicar</button><button className="button" type="button" onClick={search.reset}>Ver todo</button><QueryError error={vendors.error} retry={vendors.reload} /></form>}
    <QueryError error={query.error} retry={query.reload} />{query.loading && <p className="client-empty" role="status">Consultando panel comercial…</p>}
    {summary && <><div className="report-metrics dashboard-metrics"><article className="report-metric"><span>Prospectos calificados</span><strong>{qualified.length}</strong></article><article className="report-metric"><span>Alertas pendientes</span><strong>{alerts.length}</strong></article><article className="report-metric"><span>Ventas pendientes</span><strong>{summary.ventas_pendientes.cantidad}</strong></article><article className="report-metric"><span>Valor proyectado</span><strong>{money(summary.ventas_pendientes.total_proyectado)}</strong></article><article className="report-metric"><span>Clientes asignados</span><strong>{summary.asignaciones_activas}</strong></article>{admin && <article className="report-metric"><span>Calificados sin vendedor</span><strong>{unassigned.length}</strong></article>}</div><p className="helper-copy" aria-live="polite">Última actualización: {updatedAt}. Consulta automática cada 3 segundos.</p>
      <section className="alerts-section"><div className="section-title"><div><h2>Alertas que requieren atención</h2><p>Actúa sobre las notificaciones pendientes.</p></div><Link className="table-link" to="/alertas">Ver todas las alertas →</Link></div><div className="alert-cards">{alerts.slice(0, 6).map((alert) => <article className={`alert-card ${!alert.id_vendedor ? 'unassigned' : ''}`} key={alert.id_alerta}><span className="eyebrow">{alert.tipo_alerta}</span><h3><ClientLink id={alert.id_cliente}>{alert.nombre_completo}</ClientLink></h3><p>{alert.mensaje}</p><small>{formatDateTime(alert.fecha_creacion)} · {alert.id_vendedor ? (alert.nombre_vendedor || 'Vendedor asignado') : 'Sin vendedor · Administración'}</small><button className="button primary action-button" disabled={busy} onClick={() => setSelected(alert)}>Atender alerta</button></article>)}{!alerts.length && <p className="empty-panel">No hay alertas pendientes.</p>}</div></section>
      <div className="section-title"><div><h2>{admin ? 'Calificados asignados' : 'Tus prospectos calificados'}</h2><p>Ordenados de mayor a menor puntaje.</p></div></div><div className="dashboard-table-scroll"><ModuleTable rows={assigned} rowKey="id_cliente" columns={[{ key: 'nombre_completo', label: 'Cliente', render: (row) => <ClientLink id={row.id_cliente}>{row.nombre_completo}</ClientLink> }, { key: 'correo_electronico', label: 'Correo' }, { key: 'puntaje_total', label: 'Puntaje', render: (row) => <Score value={row.puntaje_total} /> }, ...(admin ? [{ key: 'nombre_vendedor', label: 'Vendedor' }] : [])]} empty="No hay prospectos calificados asignados en esta vista." /></div>
      {admin && <><div className="section-title"><div><h2>Prospectos sin asignar</h2><p>Calificados que necesitan un responsable comercial.</p></div><Link className="table-link" to="/asignaciones">Gestionar asignaciones →</Link></div><ModuleTable rows={unassigned} rowKey="id_cliente" columns={[{ key: 'nombre_completo', label: 'Cliente', render: (row) => <ClientLink id={row.id_cliente}>{row.nombre_completo}</ClientLink> }, { key: 'correo_electronico', label: 'Correo' }, { key: 'puntaje_total', label: 'Puntaje', render: (row) => <Score value={row.puntaje_total} /> }]} empty="No hay prospectos calificados sin asignar en esta vista." /></>}
      <div className="section-title"><div><h2>Pruebas próximas a vencer</h2><p>Prioriza las pruebas de evaluación que requieren seguimiento.</p></div><Link className="table-link" to="/pruebas?estado_prueba=Activa">Consultar pruebas →</Link></div><ModuleTable rows={summary.pruebas_por_vencer} rowKey="id_descarga" rowClass={() => 'urgent-row'} columns={[{ key: 'nombre_completo', label: 'Cliente', render: (row) => <ClientLink id={row.id_cliente}>{row.nombre_completo}</ClientLink> }, { key: 'nombre_producto', label: 'Producto' }, { key: 'fecha_fin', label: 'Vence', render: (row) => formatDate(row.fecha_fin) }, { key: 'dias_restantes', label: 'Urgencia', render: (row) => <span className="urgency-label">{row.dias_restantes} día(s)</span> }]} />
    </>}
    <div className="section-title"><div><h2>Continuar con una tarea</h2></div></div><div className="quick-grid"><Link className="quick-card" to="/productos"><span className="quick-icon lavender">▦</span><span><strong>Catálogo</strong><small>Productos y licencias</small></span><b>→</b></Link><Link className="quick-card" to="/pruebas"><span className="quick-icon mint">◷</span><span><strong>Pruebas gratuitas</strong><small>Registrar y consultar</small></span><b>→</b></Link><Link className="quick-card" to="/actividad"><span className="quick-icon peach">↗</span><span><strong>Actividad</strong><small>Historial del cliente</small></span><b>→</b></Link></div>
    {selected && <AlertAttention alert={selected} onClose={() => setSelected(null)} onConfirm={confirm} busy={busy} error={notice?.type === 'error' ? notice.text : ''} />}
  </>;
}
