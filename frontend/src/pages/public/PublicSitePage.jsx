import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Brand from '../../components/common/Brand.jsx';
import Notice from '../../components/common/Notice.jsx';
import { useApiAction } from '../../hooks/useApiAction.js';
import { getPublicCatalog, recordPublicActivity, registerPublicLead, registerPublicTrial } from '../../services/publicSite.service.js';
import { formatDate, formatMoney } from '../../utils/formatters.js';

const pagesToTrack = [
  { label: 'Ver productos', match: /visita a página de producto/i, detail: 'El visitante abrió la página de productos.' },
  { label: 'Consultar precios', match: /visita a página de precios|consulta de planes/i, detail: 'El visitante consultó los planes y precios.' },
  { label: 'Comparar planes', match: /página de comparación/i, detail: 'El visitante comparó los planes disponibles.' },
  { label: 'Leer caso de éxito', match: /casos de éxito|artículo del blog/i, detail: 'El visitante leyó contenido del sitio.' },
];

function getVisitorKey() {
  const storageKey = 'zimbra_public_visitor';
  let key = window.localStorage.getItem(storageKey);
  if (!key) {
    key = window.crypto?.randomUUID?.() || `visitante-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    window.localStorage.setItem(storageKey, key);
  }
  return key;
}

export default function PublicSitePage() {
  const [catalog, setCatalog] = useState({ products: [], actions: [], campaigns: [] });
  const [catalogError, setCatalogError] = useState('');
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [visitorKey] = useState(getVisitorKey);
  const [form, setForm] = useState({ nombre_completo: '', correo_electronico: '', telefono: '', nombre_empresa: '', id_producto: '' });
  const [registered, setRegistered] = useState(null);
  const [trial, setTrial] = useState(null);
  const [purchaseInterest, setPurchaseInterest] = useState(null);
  const [leadOnly, setLeadOnly] = useState(null);
  const [events, setEvents] = useState([]);
  const { busy, notice, run, setNotice } = useApiAction();
  const customerProducts = useMemo(() => catalog.products.filter((product) => ['Prueba 60 dias', 'Comercial'].includes(product.tipo_licencia)), [catalog.products]);
  const selectedProduct = customerProducts.find((product) => String(product.id_producto) === String(form.id_producto));

  useEffect(() => {
    let active = true;
    getPublicCatalog().then((data) => {
      if (active) setCatalog({ products: data.products || [], actions: data.actions || [], campaigns: data.campaigns || [] });
    }).catch((error) => {
      if (active) setCatalogError(error.status === 404
        ? 'No se encontró el catálogo en la API. Reinicia el backend para cargar la ruta pública de productos y campañas.'
        : error.message);
    }).finally(() => {
      if (active) setLoadingCatalog(false);
    });
    return () => { active = false; };
  }, []);

  async function trackPage(page) {
    const action = catalog.actions.find((item) => page.match.test(item.nombre_accion));
    if (!action) return;
    const result = await run(() => recordPublicActivity({
      ...(registered ? { id_cliente: registered.id_cliente } : { clave_rastreo: visitorKey }),
      id_accion: action.id_accion,
      direccion_origen: window.location.pathname,
      detalle: page.detail,
    }));
    if (result) setEvents((current) => [{ label: action.nombre_accion, result, linked: Boolean(registered), anonymous: !registered }, ...current].slice(0, 5));
  }

  async function submit(event) {
    event.preventDefault();
    const result = await run(async () => {
      const lead = await registerPublicLead({ ...form, clave_rastreo: visitorKey });
      const leadContact = { ...lead, nombre_cliente: form.nombre_completo };
      setRegistered(lead);
      setEvents((current) => current.map((item) => ({ ...item, linked: true })));
      if (selectedProduct?.tipo_licencia === 'Comercial') {
        setPurchaseInterest({ lead: leadContact, product: selectedProduct });
        return { message: `Recibimos tu interés en ${selectedProduct.nombre_producto}. El equipo comercial podrá contactarte para continuar con la compra.` };
      }
      if (!selectedProduct) {
        setLeadOnly(leadContact);
        return { message: 'Tus datos quedaron registrados. El equipo podrá orientarte sobre los productos y campañas disponibles.' };
      }
      const download = await registerPublicTrial({ id_cliente: lead.id_cliente, id_producto: Number(form.id_producto) });
      setTrial(download);
      return { ...download, message: 'Registro y descarga de prueba completados. Ya puedes seguir usando el sitio.' };
    });
    if (result) {
      setNotice(null);
      setForm((current) => ({ ...current, nombre_completo: '', correo_electronico: '', telefono: '', nombre_empresa: '', id_producto: '' }));
    }
  }

  return <main className="public-site">
    <header className="public-header"><Brand /><nav aria-label="Navegación del sitio"><a href="#productos" onClick={() => trackPage(pagesToTrack[0])}>Productos</a><a href="#campanas">Campañas</a><a href="#planes" onClick={() => trackPage(pagesToTrack[1])}>Planes</a><a href="#historias" onClick={() => trackPage(pagesToTrack[3])}>Historias</a></nav><Link className="public-login" to="/equipo">Acceso del equipo</Link></header>
    <section className="public-hero">
      <div className="public-hero-copy"><span className="eyebrow">COLABORACIÓN PARA TU EQUIPO</span><h1>Tu trabajo en equipo, <em>más conectado.</em></h1><p>Conoce las herramientas de colaboración de Zimbra y prueba una versión durante 60 días.</p><a className="button primary" href="#solicitar">Solicitar prueba gratuita <span aria-hidden="true">→</span></a></div>
      <div className="public-hero-card"><span className="public-card-label">ESPACIO DE TRABAJO</span><div className="public-card-row"><span>✉</span><div><strong>Correo y calendario</strong><small>Todo tu equipo en un solo lugar</small></div></div><div className="public-card-row"><span>◈</span><div><strong>Colaboración segura</strong><small>Herramientas para trabajar mejor</small></div></div><div className="public-card-pulse"><i />Explora las funciones del producto</div></div>
    </section>
    <section className="public-content" id="productos">
      <div className="public-section-heading"><div><span className="eyebrow">CATÁLOGO</span><h2>Encuentra la solución para tu equipo</h2><p>Explora un producto para registrar la actividad de tu visita.</p></div><span className="public-session-chip">Visitante anónimo · actividad automática</span></div>
      {catalogError && <Notice notice={{ type: 'error', text: catalogError }} />}
      {loadingCatalog ? <p className="public-loading">Cargando productos…</p> : <div className="public-product-grid">{customerProducts.map((product) => <article className={`public-product-card${String(form.id_producto) === String(product.id_producto) ? ' selected' : ''}`} key={product.id_producto} onClick={() => { setForm((current) => ({ ...current, id_producto: String(product.id_producto) })); trackPage(pagesToTrack[0]); }}><span className="public-product-tag">{product.tipo_licencia === 'Comercial' ? 'PRODUCTO COMERCIAL' : 'PRUEBA DE 60 DÍAS'}</span><h3>{product.nombre_producto}</h3><p>{product.tipo_licencia === 'Comercial' ? `Compra desde ${formatMoney(product.precio)}.` : 'Explora las funciones y evalúa si se ajusta a las necesidades de tu organización.'}</p><button type="button" className="text-button">{product.tipo_licencia === 'Comercial' ? 'Me interesa →' : 'Seleccionar prueba →'}</button></article>)}</div>}
      {!loadingCatalog && !customerProducts.length && <p className="public-empty">No hay productos disponibles en el catálogo.</p>}
      <section className="public-campaigns" id="campanas" aria-labelledby="public-campaigns-title"><div className="public-section-heading"><div><span className="eyebrow">PROMOCIONES</span><h2 id="public-campaigns-title">Campañas vigentes</h2><p>Conoce las iniciativas y novedades disponibles para tu equipo.</p></div></div>{loadingCatalog ? <p className="public-loading">Cargando campañas…</p> : catalog.campaigns.length ? <div className="public-product-grid">{catalog.campaigns.map((campaign) => <article className="public-product-card" key={campaign.id_campana}><span className="public-product-tag">CAMPAÑA ACTIVA</span><h3>{campaign.nombre_campana}</h3><p>{campaign.descripcion || 'Consulta con nuestro equipo para conocer más detalles de esta campaña.'}</p><small>Vigencia: {formatDate(campaign.fecha_inicio)} – {formatDate(campaign.fecha_fin)}</small><a className="text-button" href="#solicitar">Solicitar información →</a></article>)}</div> : <p className="public-empty">El equipo aún no ha publicado campañas activas. Puedes registrar tus datos y consultar las opciones disponibles.</p>}</section>
      <div className="public-activity-panel" id="planes"><div><span className="eyebrow">RECORRIDO DEL SITIO</span><h2>Explora y conoce las funciones</h2><p>Los clics registran eventos anónimos. Si luego completas el formulario, el sistema los vincula a tu cliente.</p></div><div className="public-activity-actions">{pagesToTrack.slice(1).map((page) => <button key={page.label} className="button" type="button" disabled={busy || !catalog.actions.some((item) => page.match.test(item.nombre_accion))} onClick={() => trackPage(page)}>{page.label}</button>)}</div>{events.length > 0 && <div className="public-event-feed" aria-live="polite"><strong>Actividad reciente</strong>{events.map((event, index) => <span key={`${event.result.id_actividad}-${index}`}>{event.label} · {event.anonymous ? event.linked ? 'vinculado al cliente' : 'anónimo · pendiente de vincular' : `+${event.result.puntos_agregados || 0} puntos`}</span>)}</div>}</div>
    </section>
    <section className="public-form-section" id="solicitar"><div className="public-form-intro"><span className="eyebrow">CONOCE ZIMBRA</span><h2>Elige un producto o déjanos tus datos</h2><p>Déjanos tus datos y vincularemos las páginas que visitaste a tu registro. No necesitas crear una cuenta ni iniciar sesión; puedes registrarte aunque todavía no hayas elegido un producto.</p><div className="public-check-list"><span>✓ Sin contraseña ni inicio de sesión</span><span>✓ Productos comerciales y prueba por 60 días</span><span>✓ Tu actividad queda asociada al registro</span></div></div><form className="public-lead-form" onSubmit={submit}><h3>Datos de contacto</h3><label className="field">Nombre completo *<input required maxLength={150} autoComplete="name" value={form.nombre_completo} onChange={(event) => setForm({ ...form, nombre_completo: event.target.value })} /></label><label className="field">Correo electrónico *<input required type="email" maxLength={100} autoComplete="email" value={form.correo_electronico} onChange={(event) => setForm({ ...form, correo_electronico: event.target.value })} /></label><label className="field">Teléfono<input type="tel" maxLength={50} autoComplete="tel" value={form.telefono} onChange={(event) => setForm({ ...form, telefono: event.target.value })} /></label><label className="field">Empresa (opcional)<input maxLength={150} autoComplete="organization" value={form.nombre_empresa} onChange={(event) => setForm({ ...form, nombre_empresa: event.target.value })} /></label><label className="field">Producto que te interesa (opcional)<select value={form.id_producto} onChange={(event) => setForm({ ...form, id_producto: event.target.value })}><option value="">Todavía no lo sé / solo quiero registrarme</option>{customerProducts.map((product) => <option key={product.id_producto} value={product.id_producto}>{product.nombre_producto} · {product.tipo_licencia === 'Comercial' ? formatMoney(product.precio) : 'Prueba 60 días'}</option>)}</select></label><button className="button primary" disabled={busy || loadingCatalog}>{busy ? 'Procesando…' : !selectedProduct ? 'Registrar mis datos' : selectedProduct.tipo_licencia === 'Comercial' ? 'Solicitar información de compra' : 'Registrar y descargar prueba'}</button><p className="public-form-note">{!selectedProduct ? 'Puedes elegir un producto más adelante; primero guardaremos tu registro.' : selectedProduct.tipo_licencia === 'Comercial' ? 'Registraremos tu interés y el equipo podrá orientarte para completar la compra.' : 'Tu registro crea el cliente y la descarga de prueba en una sola experiencia.'}</p></form></section>
    <section className="public-proof" id="historias"><span className="eyebrow">SIMULACIÓN DEL RECORRIDO</span><h2>Del primer clic a una prueba de producto</h2><div className="public-steps"><article><span>01</span><strong>Explora</strong><p>El sitio registra visitas con una clave anónima temporal.</p></article><article><span>02</span><strong>Regístrate</strong><p>El formulario vincula la actividad previa a tu ficha de cliente.</p></article><article><span>03</span><strong>Prueba</strong><p>El sistema registra el producto y calcula el vencimiento a 60 días.</p></article></div></section>
    <footer className="public-footer"><Brand /><span>© Zimbra CRM · Sitio de demostración</span></footer>
    <Notice notice={notice} />
    {trial && <div className="public-success" role="status"><strong>¡Tu prueba quedó registrada!</strong><span>{trial.nombre_cliente} · vence el {formatDate(trial.fecha_fin)} · {trial.puntos_agregados ?? 0} puntos por la descarga · total {trial.puntaje_total ?? '—'} · estado {trial.estado_cliente ?? 'Frio'}</span><button type="button" className="text-button" onClick={() => setTrial(null)}>Cerrar</button></div>}
    {purchaseInterest && <div className="public-success" role="status"><strong>¡Recibimos tu interés!</strong><span>{purchaseInterest.product.nombre_producto} · {purchaseInterest.lead.nombre_cliente}. El equipo podrá contactarte para continuar con la compra.</span><button type="button" className="text-button" onClick={() => setPurchaseInterest(null)}>Cerrar</button></div>}
    {leadOnly && <div className="public-success" role="status"><strong>¡Registro recibido!</strong><span>{leadOnly.nombre_cliente}. El equipo podrá orientarte sobre productos y campañas disponibles.</span><button type="button" className="text-button" onClick={() => setLeadOnly(null)}>Cerrar</button></div>}
  </main>;
}
