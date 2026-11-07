import { useProducts } from '../../hooks/useProducts.js';
import { formatCurrency, formatDate } from '../../utils/formatters.js';

export default function DashboardPage({ session, setPage }) {
  const { products, error } = useProducts();
  return <>
    <div className="page-heading"><div><span className="eyebrow">PANEL DE CONTROL</span><h1>Hola, {session.user.email?.split('@')[0]}</h1><p>Desde aquí puedes gestionar el ciclo comercial de Zimbra.</p></div><span className="date-chip">{formatDate()}</span></div>
    <div className="welcome-card"><div><span className="eyebrow">CRM ZIMBRA</span><h2>Todo el proceso comercial,<br />en un solo flujo.</h2><p>Registra prospectos, inicia pruebas gratuitas y convierte oportunidades en ventas.</p><button className="button light" onClick={() => setPage('clients')}>Registrar un cliente <span>→</span></button></div><div className="welcome-art"><div className="orb orb-one" /><div className="orb orb-two" /><div className="art-card"><span>OPORTUNIDAD</span><strong>En seguimiento</strong><div className="progress"><i /></div><small>Prueba gratuita · 60 días</small></div></div></div>
    <div className="section-title"><div><h2>Accesos rápidos</h2><p>Continúa con una acción frecuente.</p></div></div>
    <div className="quick-grid"><button className="quick-card" onClick={() => setPage('clients')}><span className="quick-icon lavender">＋</span><span><strong>Nuevo cliente</strong><small>Registra un prospecto</small></span><b>→</b></button><button className="quick-card" onClick={() => setPage('trials')}><span className="quick-icon mint">◷</span><span><strong>Iniciar prueba</strong><small>Activa una licencia gratuita</small></span><b>→</b></button><button className="quick-card" onClick={() => setPage('sales')}><span className="quick-icon peach">＄</span><span><strong>Registrar venta</strong><small>Crea una nueva transacción</small></span><b>→</b></button></div>
    <div className="section-title products-heading"><div><h2>Catálogo disponible</h2><p>Productos activos para pruebas y ventas.</p></div><span className="count-chip">{products.length} productos</span></div>
    {error && <div className="notice error">{error}</div>}
    <div className="product-list">{products.slice(0, 5).map((product) => <div className="product-row" key={product.id_producto}><span className="product-logo">Z</span><div><strong>{product.nombre_producto}</strong><small>{product.tipo_licencia}</small></div><span className="product-price">{formatCurrency(product.precio)}</span></div>)}</div>
  </>;
}
