import SearchInput from '../../components/common/SearchInput.jsx';
import DismissiblePanel from '../../components/common/DismissiblePanel.jsx';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../hooks/useAuth.js';
import { useApiAction } from '../../hooks/useApiAction.js';
import { useProducts } from '../../hooks/useProducts.js';
import { useModuleQuery } from '../../hooks/useModuleQuery.js';
import { useModuleFilters, useResetSelectsAfterQuery } from '../../hooks/useModuleFilters.js';
import { saveModule } from '../../services/modulos.service.js';
import { createTrial } from '../../services/descargas.service.js';
import { formatCurrency, formatDate } from '../../utils/formatters.js';
import { ActionDialog, ClientLink, ClientLookup, ModuleTable, PageHeading, Pagination, QueryError, Status } from '../../components/common/ModuleUI.jsx';
import Notice from '../../components/common/Notice.jsx';

export default function DescargasPage({ suggestedClientId }) {
  const { session } = useAuth();
  const admin = session.user.role === 'Administrador';
  const productsQuery = useProducts();
  const products = useMemo(() => productsQuery.products.filter((product) => ['Gratuita', 'Prueba 60 dias'].includes(product.tipo_licencia)), [productsQuery.products]);
  const { busy, notice, run } = useApiAction();
  const [form, setForm] = useState({ id_cliente: String(suggestedClientId || ''), id_producto: '' });
  const [created, setCreated] = useState(null);
  const [expire, setExpire] = useState(false);
  const [summary, setSummary] = useState(null);
  const [saleId, setSaleId] = useState(null);
  const [clientSearch, setClientSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const search = useModuleFilters({ estado_prueba: '', id_cliente: '', id_producto: '', vence_desde: '', vence_hasta: '' });
  const list = useModuleQuery('/trials', { ...search.filters, page: search.page, limit: search.limit });
  useResetSelectsAfterQuery(search, list, ['estado_prueba']);
  const sale = useModuleQuery('/sales/detalle', { id_venta: saleId }, { enabled: !!saleId });
  useEffect(() => { if (suggestedClientId) setForm((current) => ({ ...current, id_cliente: String(suggestedClientId) })); }, [suggestedClientId]);
  async function submit(event) {
    event.preventDefault();
    const result = await run(() => createTrial(session.token, { id_cliente: Number(form.id_cliente), id_producto: Number(form.id_producto) }));
    if (result) { setCreated(result); setForm((current) => ({ ...current, id_cliente: '', id_producto: '' })); list.reload(); }
  }
  async function expireTrials() {
    const result = await run(() => saveModule(session.token, '/trials/actualizar-vencimientos', {}));
    if (result) { setSummary(result); setExpire(false); list.reload(); }
  }
  const columns = [
    { key: 'id_descarga', label: 'Prueba' }, { key: 'nombre_completo', label: 'Cliente', render: (row) => <ClientLink id={row.id_cliente}>{row.nombre_completo}</ClientLink> },
    { key: 'nombre_producto', label: 'Producto' }, { key: 'fecha_inicio', label: 'Inicio', render: (row) => formatDate(row.fecha_inicio) },
    { key: 'fecha_fin', label: 'Vencimiento', render: (row) => formatDate(row.fecha_fin) },
    { key: 'dias_restantes', label: 'Tiempo restante', render: (row) => row.estado_prueba === 'Activa' ? <span className={row.urgente ? 'urgency-label' : ''}>{row.dias_restantes} día(s){row.urgente ? ' · Próxima a vencer' : ''}</span> : '—' },
    { key: 'estado_prueba', label: 'Estado', render: (row) => <Status value={row.estado_prueba} /> },
    { key: 'id_venta', label: 'Conversión', render: (row) => row.id_venta ? <button className="text-button" onClick={() => setSaleId(row.id_venta)}>Ver venta #{row.id_venta}</button> : '—' },
  ];
  return <><PageHeading title="Pruebas gratuitas" actions={admin && <button className="button" disabled={busy} onClick={() => setExpire(true)}>Actualizar vencimientos</button>}>Registra evaluaciones de 60 días y consulta su evolución hasta la compra.</PageHeading><Notice notice={notice} />
    <form className="form-card trial-registration-form" onSubmit={submit}><h2>Iniciar prueba de 60 días</h2><div className="form-grid"><ClientLookup required excludeInactive value={form.id_cliente} onChange={(value) => setForm({ ...form, id_cliente: value })} /><label className="field">Producto gratuito o de prueba *<select required value={form.id_producto} onChange={(event) => setForm({ ...form, id_producto: event.target.value })}><option value="">Selecciona una licencia</option>{products.map((product) => <option key={product.id_producto} value={product.id_producto}>{product.nombre_producto}</option>)}</select></label><div className="form-actions"><button className="button primary" disabled={busy || productsQuery.loading || !products.length}>{busy ? 'Registrando…' : 'Activar prueba'}</button></div></div><QueryError error={productsQuery.error} retry={productsQuery.reload} /><p className="helper-copy">Las fechas, el puntaje y la calificación los calcula el servidor. No se permiten pruebas activas repetidas del mismo producto y cliente.</p></form>
    {created && <DismissiblePanel noticeKey={created} onClose={() => setCreated(null)} className="form-card result-card" aria-live="polite"><h2>Prueba #{created.id_descarga} registrada</h2><p>Cliente: {created.nombre_cliente} · Vence el {formatDate(created.fecha_fin)}</p><p>Puntos agregados: <strong>{created.puntos_agregados ?? 0}</strong> · Total: <strong>{created.puntaje_total}</strong> · Estado: <Status value={created.estado_cliente} /></p><details><summary>Vista previa ilustrativa de bienvenida</summary><p>Hola {created.nombre_cliente}, tu prueba gratuita está disponible hasta el {formatDate(created.fecha_fin)}.</p><small>Esta vista previa no confirma un envío real de correo.</small></details></DismissiblePanel>}
    {summary && <DismissiblePanel as="div" noticeKey={summary} onClose={() => setSummary(null)} className="notice info" role="status">Pruebas vencidas: {summary.vencidas ?? 0}. Alertas generadas: {summary.alertas_generadas ?? 0}. Avisos procesados: {summary.correos_solicitados ?? 0}. Fallos de avisos: {summary.correos_fallidos ?? 0}.</DismissiblePanel>}
    <h2>Descargas registradas</h2><form className="module-filters form-card" onSubmit={(event) => { search.apply(event); setClientSearch(''); setProductSearch(''); list.reload(); }}><label className="field">Estado<select value={search.draft.estado_prueba} onChange={(event) => search.setDraft({ ...search.draft, estado_prueba: event.target.value })}><option value="">Todos</option>{['Activa', 'Vencida', 'Cancelada', 'Convertida'].map((state) => <option key={state}>{state}</option>)}</select></label><label className="field">Buscar cliente<SearchInput label="Buscar cliente en descargas" path="/clients" value={clientSearch} onChange={value => { setClientSearch(value); search.setDraft(current => ({ ...current, id_cliente: /^\d+$/.test(value) ? value : '' })); }} onSelect={row => { search.apply(undefined, { ...search.draft, id_cliente: String(row.id_cliente) }); list.reload(); }} placeholder="Nombre, correo o ID" /></label><label className="field">Buscar producto<SearchInput label="Buscar producto en descargas" path="/products" kind="product" params={!admin ? { estado: true } : {}} value={productSearch} onChange={value => { setProductSearch(value); search.setDraft(current => ({ ...current, id_producto: /^\d+$/.test(value) ? value : '' })); }} onSelect={row => { search.apply(undefined, { ...search.draft, id_producto: String(row.id_producto) }); list.reload(); }} placeholder="Nombre o ID" /></label><label className="field">Vence desde<input type="date" max={search.draft.vence_hasta || undefined} value={search.draft.vence_desde} onChange={(event) => search.setDraft({ ...search.draft, vence_desde: event.target.value })} /></label><label className="field">Vence hasta<input type="date" min={search.draft.vence_desde || undefined} value={search.draft.vence_hasta} onChange={(event) => search.setDraft({ ...search.draft, vence_hasta: event.target.value })} /></label><button className="button primary">Filtrar</button><button type="button" className="button" onClick={() => { search.reset(); setClientSearch(''); setProductSearch(''); }}>Limpiar</button></form><QueryError error={list.error} retry={list.reload} /><ModuleTable managed columns={columns} rows={list.data?.data || []} loading={list.loading} rowKey="id_descarga" rowClass={(row) => row.urgente ? 'urgent-row' : ''} /><Pagination size={search.limit} onSize={search.setLimit} result={list.data} page={search.page} onPage={search.setPage} disabled={list.loading} />
    {expire && <ActionDialog title="Actualizar vencimientos" onClose={() => setExpire(false)} onSubmit={expireTrials} busy={busy} error={notice?.type === 'error' ? notice.text : ''}><p>El servidor marcará las pruebas vencidas y generará las alertas que correspondan. Las pruebas convertidas conservan su estado.</p></ActionDialog>}
    {saleId && <ActionDialog title={`Venta #${saleId}`} onClose={() => setSaleId(null)} onSubmit={() => setSaleId(null)} confirm="Cerrar detalle"><QueryError error={sale.error} retry={sale.reload} />{sale.loading ? <p role="status">Consultando venta…</p> : sale.data && <><p>Contrato: {sale.data.numero_contrato || '—'} · Estado: {sale.data.estado_venta}</p><p>Total: {formatCurrency(sale.data.total_venta)}</p><ModuleTable rowKey="id_detalle" rows={sale.data.detalles || []} columns={[{ key: 'nombre_producto', label: 'Producto' }, { key: 'cantidad', label: 'Cantidad' }, { key: 'precio_unitario', label: 'Precio histórico', render: (row) => formatCurrency(row.precio_unitario) }, { key: 'subtotal', label: 'Subtotal', render: (row) => formatCurrency(row.subtotal) }]} /></>}</ActionDialog>}
  </>;
}
