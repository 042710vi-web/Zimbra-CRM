import SearchInput from '../../components/common/SearchInput.jsx';
import { useRef, useState } from 'react';
import { useAuth } from '../../hooks/useAuth.js';
import { useApiAction } from '../../hooks/useApiAction.js';
import { useModuleQuery } from '../../hooks/useModuleQuery.js';
import { useModuleFilters, useResetSelectsAfterQuery } from '../../hooks/useModuleFilters.js';
import { saveModule } from '../../services/modulos.service.js';
import { formatCurrency, formatMoney, formatDate, localToday } from '../../utils/formatters.js';
import { ActionDialog, ModuleTable, PageHeading, Pagination, QueryError, Status } from '../../components/common/ModuleUI.jsx';
import Notice from '../../components/common/Notice.jsx';

const configs = {
  products: {
    path: '/products', title: 'Productos y licencias', singular: 'producto', id: 'id_producto', name: 'nombre_producto',
    description: 'Administra el catálogo conservando las ventas y sus precios históricos.',
    initial: { nombre_producto: '', tipo_licencia: '', precio: '' }, filters: { q: '', tipo_licencia: '', estado: '' },
    fields: [{ key: 'nombre_producto', label: 'Nombre del producto', max: 100 }, { key: 'tipo_licencia', label: 'Licencia', options: ['Gratuita', 'Prueba 60 dias', 'Comercial'] }, { key: 'precio', label: 'Precio', type: 'number', min: 0, max: 99999999.99, step: '0.01' }],
    columns: [{ key: 'nombre_producto', label: 'Producto' }, { key: 'tipo_licencia', label: 'Licencia' }, { key: 'precio', label: 'Precio', render: (row) => formatCurrency(row.precio) }, { key: 'fecha_creacion', label: 'Creación', render: (row) => formatDate(row.fecha_creacion) }],
  },
  campaigns: {
    path: '/campaigns', title: 'Campañas de marketing', singular: 'campaña', id: 'id_campana', name: 'nombre_campana',
    description: 'Crea campañas con nombres únicos y consulta su actividad y prospectos calificados.',
    initial: { nombre_campana: '', codigo_campana: '', descripcion: '', presupuesto: '', fecha_inicio: '', fecha_fin: '', estado: 'Activa' }, filters: { estado: '', desde: '', hasta: '' },
    fields: [{ key: 'nombre_campana', label: 'Nombre único', max: 150 }, { key: 'codigo_campana', label: 'Código (opcional)', max: 50, optional: true, pattern: '[A-Za-z0-9_-]+' }, { key: 'presupuesto', label: 'Presupuesto', type: 'number', min: 0, max: 9999999999.99, step: '0.01' }, { key: 'fecha_inicio', label: 'Inicio', type: 'date' }, { key: 'fecha_fin', label: 'Fin', type: 'date' }, { key: 'descripcion', label: 'Descripción (opcional)', optional: true, textarea: true }],
    columns: [{ key: 'nombre_campana', label: 'Campaña' }, { key: 'codigo_campana', label: 'Código' }, { key: 'presupuesto', label: 'Presupuesto', render: (row) => formatMoney(row.presupuesto) }, { key: 'fecha_inicio', label: 'Inicio', render: (row) => formatDate(row.fecha_inicio) }, { key: 'fecha_fin', label: 'Fin', render: (row) => formatDate(row.fecha_fin) }, { key: 'visitas', label: 'Visitas' }, { key: 'visitantes', label: 'Visitantes' }, { key: 'prospectos_calificados', label: 'Calificados' }],
  },
  actions: {
    path: '/actions', title: 'Acciones y puntajes', singular: 'acción', id: 'id_accion', name: 'nombre_accion',
    description: 'Define las acciones de marketing y el puntaje que reciben los nuevos eventos.',
    initial: { nombre_accion: '', puntaje: '' }, filters: { q: '', estado: '' },
    fields: [{ key: 'nombre_accion', label: 'Nombre único de la acción', max: 100 }, { key: 'puntaje', label: 'Puntaje (0 a 100)', type: 'number', min: 0, max: 100, step: '1' }],
    columns: [{ key: 'nombre_accion', label: 'Acción' }, { key: 'puntaje', label: 'Puntaje' }, { key: 'veces_registrada', label: 'Ejecuciones históricas' }],
  },
};

function Catalogo({ kind }) {
  const config = configs[kind];
  const { session } = useAuth();
  const admin = session.user.role === 'Administrador';
  const search = useModuleFilters(config.filters);
  const query = useModuleQuery(config.path, { ...search.filters, ...(!admin ? { estado: true } : {}), page: search.page, limit: search.limit });
  useResetSelectsAfterQuery(search, query, kind === 'products' ? ['q', 'tipo_licencia', 'estado'] : ['q', 'estado']);
  const { busy, notice, setNotice, run } = useApiAction();
  const [form, setForm] = useState(config.initial);
  const [editing, setEditing] = useState(null);
  const [errors, setErrors] = useState({});
  const [pending, setPending] = useState(null);
  const [newEnd, setNewEnd] = useState('');
  const formRef = useRef(null);

  function reset() { setEditing(null); setForm(config.initial); setErrors({}); }
  function change(key, value) {
    setForm((current) => ({ ...current, [key]: value, ...(kind === 'products' && key === 'tipo_licencia' && value !== 'Comercial' ? { precio: '0' } : {}) }));
    setErrors((current) => ({ ...current, [key]: '' }));
  }
  async function submit(event) {
    event.preventDefault();
    const invalid = {};
    config.fields.forEach((field) => { if (!field.optional && String(form[field.key] ?? '').trim() === '') invalid[field.key] = 'Este campo es obligatorio.'; });
    if (kind === 'products' && form.tipo_licencia === 'Comercial' && Number(form.precio) <= 0) invalid.precio = 'La licencia comercial requiere un precio mayor que cero.';
    if (kind === 'campaigns' && form.fecha_fin < form.fecha_inicio) invalid.fecha_fin = 'El fin no puede ser anterior al inicio.';
    if (Object.keys(invalid).length) { setErrors(invalid); setNotice({ type: 'error', text: 'Revisa los campos indicados.' }); return; }
    if (kind === 'campaigns' && editing && form.estado !== 'Activa') { setNotice({ type: 'error', text: 'Reactiva la campaña antes de editarla.' }); return; }
    const body = { ...form, ...(editing ? { [config.id]: editing } : {}) };
    config.fields.filter((field) => field.type === 'number').forEach((field) => { body[field.key] = Number(body[field.key]); });
    if (kind === 'campaigns' && !editing) body.estado = 'Activa';
    const result = await run(() => saveModule(session.token, `${config.path}${editing ? '/actualizar' : ''}`, body));
    if (result) { reset(); query.reload(); }
  }
  function edit(row) {
    if (kind === 'campaigns' && row.estado !== 'Activa') { setNotice({ type: 'error', text: 'Reactiva la campaña antes de editarla.' }); return; }
    setEditing(row[config.id]);
    setForm(Object.fromEntries(Object.keys(config.initial).map((key) => [key, config.fields.some((field) => field.key === key && field.type === 'date') ? String(row[key] || '').slice(0, 10) : row[key] ?? config.initial[key]])));
    setErrors({}); setNotice(null); formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); formRef.current?.querySelector('input')?.focus({ preventScroll: true });
  }
  async function confirmState() {
    const active = kind === 'campaigns' ? pending.estado === 'Activa' : Boolean(Number(pending.estado));
    const body = { [config.id]: pending[config.id], estado: kind === 'campaigns' ? (active ? 'Inactiva' : 'Activa') : !active };
    if (kind === 'campaigns' && !active && String(pending.fecha_fin).slice(0, 10) < localToday()) body.fecha_fin = newEnd;
    if (await run(() => saveModule(session.token, `${config.path}/cambiar-estado`, body))) { if (kind === 'campaigns' && active && editing === pending[config.id]) reset(); setPending(null); query.reload(); }
  }
  const columns = [...config.columns, { key: 'estado', label: 'Estado', render: (row) => <Status value={kind === 'campaigns' ? row.estado : Boolean(Number(row.estado))} /> }];
  if (admin) columns.push({ key: 'actions', label: 'Acciones', render: (row) => {
    const active = kind === 'campaigns' ? row.estado === 'Activa' : Boolean(Number(row.estado));
    return <div className="table-actions"><button className="button action-button" disabled={busy || (kind === 'campaigns' && !active)} title={kind === 'campaigns' && !active ? 'Reactiva la campaña antes de editarla.' : 'Editar'} onClick={() => edit(row)}>Editar</button><button className="button" disabled={busy} onClick={() => { setPending(row); setNewEnd(''); }}>{active ? 'Desactivar' : 'Activar'}</button></div>;
  } });
  return <><PageHeading title={config.title}>{config.description}</PageHeading><Notice notice={notice} />
    {admin && <form ref={formRef} className={`form-card${kind === 'campaigns' ? ' campaign-registration-form' : kind === 'actions' ? ' action-registration-form' : kind === 'products' ? ' product-registration-form' : ''}`} onSubmit={submit}><h2>{editing ? `Editar ${config.singular} #${editing}` : `Registrar ${config.singular}`}</h2><div className="form-grid">{config.fields.map((field) => {
      const props = { name: field.key, value: form[field.key], required: !field.optional, onChange: (event) => change(field.key, event.target.value), 'aria-invalid': !!errors[field.key], 'aria-describedby': errors[field.key] ? `error-${field.key}` : undefined };
      return <label className="field" key={field.key}>{field.label}{!field.optional && ' *'}{field.options ? <select {...props}><option value="">Selecciona una opción</option>{field.options.map((option) => <option key={option}>{option}</option>)}</select> : field.textarea ? <textarea {...props} rows={3} maxLength={2000} /> : <input {...props} type={field.type || 'text'} maxLength={field.type === 'number' ? undefined : field.max} max={field.type === 'date' && field.key === 'fecha_inicio' ? form.fecha_fin || undefined : field.max} min={field.key === 'fecha_fin' ? form.fecha_inicio || undefined : kind === 'products' && field.key === 'precio' && form.tipo_licencia === 'Comercial' ? '0.01' : field.min} step={field.step} pattern={field.pattern} readOnly={kind === 'products' && field.key === 'precio' && form.tipo_licencia !== 'Comercial'} />}{errors[field.key] && <span className="field-error" id={`error-${field.key}`}>{errors[field.key]}</span>}</label>;
    })}</div><p className="helper-copy">{kind === 'products' ? 'Las licencias gratuitas y de prueba valen cero. Los cambios de precio solo afectan ventas futuras.' : kind === 'campaigns' ? 'El nombre no puede repetirse. Las campañas nuevas se registran activas.' : 'Cambiar el puntaje no modifica los puntos ya registrados en el historial.'}</p><div className="form-actions">{editing && <button className="button action-button" type="button" onClick={reset} disabled={busy}>Cancelar edición</button>}<button className="button primary" disabled={busy}>{busy ? 'Guardando…' : editing ? 'Guardar cambios' : `Registrar ${config.singular}`}</button></div></form>}
    {!admin && <p className="notice info">Tu rol permite consultar los productos activos.</p>}
    <form className="module-filters form-card" onSubmit={(event) => { search.apply(event); query.reload(); }}>
      {'q' in config.filters && <label className="field">Buscar<SearchInput label={`Buscar ${config.singular}`} path={config.path} kind={kind === 'products' ? 'product' : 'action'} params={{ ...search.draft, ...(!admin ? { estado: true } : {}) }} value={search.draft.q} onChange={q => search.setDraft(current => ({ ...current, q }))} onSelect={row => { search.apply(undefined, { ...search.draft, q: row[config.name] }, ['q']); query.reload(); }} placeholder="Nombre" /></label>}
      {kind === 'products' && <label className="field">Licencia<select value={search.draft.tipo_licencia} onChange={(event) => search.setDraft({ ...search.draft, tipo_licencia: event.target.value })}><option value="">Todas</option>{configs.products.fields[1].options.map((type) => <option key={type}>{type}</option>)}</select></label>}
      {admin && <label className="field">Estado<select value={search.draft.estado} onChange={(event) => search.setDraft({ ...search.draft, estado: event.target.value })}><option value="">Todos</option><option value={kind === 'campaigns' ? 'Activa' : 'true'}>Activo</option><option value={kind === 'campaigns' ? 'Inactiva' : 'false'}>Inactivo</option></select></label>}
      {kind === 'campaigns' && <><label className="field">Desde<input type="date" value={search.draft.desde} max={search.draft.hasta || undefined} onChange={(event) => search.setDraft({ ...search.draft, desde: event.target.value })} /></label><label className="field">Hasta<input type="date" value={search.draft.hasta} min={search.draft.desde || undefined} onChange={(event) => search.setDraft({ ...search.draft, hasta: event.target.value })} /></label></>}
      <button className="button primary">Filtrar</button><button className="button" type="button" onClick={search.reset}>Limpiar</button>
    </form><QueryError error={query.error} retry={query.reload} /><ModuleTable managed tableClassName={kind === 'campaigns' ? '' : `balanced-table ${admin ? 'balanced-actions-table' : ''}`} columns={columns} rows={query.data?.data || []} rowKey={config.id} loading={query.loading} /><Pagination size={search.limit} onSize={search.setLimit} result={query.data} page={search.page} onPage={search.setPage} disabled={query.loading} />
    {pending && <ActionDialog title={`Cambiar estado: ${pending[config.name]}`} onClose={() => setPending(null)} onSubmit={confirmState} busy={busy} error={notice?.type === 'error' ? notice.text : ''}><p>El historial se conserva. {kind === 'products' ? 'Un producto inactivo no estará disponible para nuevas ventas ni pruebas.' : kind === 'campaigns' ? 'Las campañas inactivas no reciben nuevas asociaciones de actividad web.' : 'La acción desactivada no estará disponible para nuevos eventos.'}</p>{kind === 'campaigns' && pending.estado === 'Inactiva' && String(pending.fecha_fin).slice(0, 10) < localToday() && <label className="field">Nueva fecha de fin *<input required type="date" min={[localToday(), String(pending.fecha_inicio).slice(0, 10)].sort().at(-1)} value={newEnd} onChange={(event) => setNewEnd(event.target.value)} /></label>}</ActionDialog>}
  </>;
}
export const ProductosPage = () => <Catalogo kind="products" />;
export const CampanasPage = () => <Catalogo kind="campaigns" />;
export const AccionesPage = () => <Catalogo kind="actions" />;
