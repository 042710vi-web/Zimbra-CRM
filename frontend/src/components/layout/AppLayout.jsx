import Brand from '../common/Brand.jsx';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';

const menu = [
  ['/crm', 'Resumen', '⌂'],
  ['/clientes', 'Registrar cliente', '+'],
  ['/empresas', 'Empresas', '▦'],
  ['/productos', 'Productos y licencias', '◇'],
  ['/campanas', 'Campañas', '⚑'],
  ['/acciones', 'Acciones y puntajes', '★'],
  ['/actividad', 'Actividad web', '◎'],
  ['/calificacion', 'Calificación', '◈'],
  ['/alertas', 'Alertas', '♧'],
  ['/auditoria', 'Auditoría', '≡'],
  ['/salesforce', 'Salesforce', '↻'],
  ['/pruebas', 'Pruebas gratuitas', '◷'],
  ['/asignaciones', 'Asignaciones', '↗'],
  ['/interacciones', 'Interacciones', '☏'],
  ['/ventas', 'Registrar venta', '$'],
  ['/reportes', 'Reportes', '▤'],
  ['/plantillas', 'Correos', '✉'],
  ['/vendedores', 'Vendedores', '♙'],
].sort((a, b) => a[1].localeCompare(b[1], 'es', { sensitivity: 'base' }));

const sellerMenuPaths = ['/crm', '/clientes', '/pruebas', '/asignaciones', '/interacciones', '/ventas'];

export default function AppLayout() {
  const { session, logout } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const user = session?.user || {};
  const currentTitle = menu.find(([path]) => path === pathname)?.[1] || 'Resumen';
  return <div className={`app-shell${user.role === 'Vendedor' ? ' seller-view' : ''}`}>
    <aside className="sidebar">
      <Brand />
      <div className="workspace-label">ESPACIO DE TRABAJO</div>
      <nav>{menu.filter(([path]) => user.role === 'Administrador' || sellerMenuPaths.includes(path)).map(([path, label, icon]) => <NavLink key={path} to={path} end={path === '/crm'} title={label} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}><span className="nav-icon">{icon}</span>{label}</NavLink>)}</nav>
      <div className="sidebar-bottom"><div className="online-dot" /> Sistema conectado <NavLink to="/" className="public-site-link">Sitio público</NavLink></div>
    </aside>
    <main className="main-area">
      <header className="topbar"><div className="crumb">CRM <span>/</span> {currentTitle}</div><div className="account"><div className="avatar">{user.email?.[0]?.toUpperCase() || 'U'}</div><div className="account-copy"><strong>{user.email || 'Usuario'}</strong><small>{user.role || 'Sesión'}</small></div><button className="logout" onClick={() => { logout(); navigate('/'); }}>Salir</button></div></header>
      <div className="page-content"><Outlet /></div>
    </main>
  </div>;
}
