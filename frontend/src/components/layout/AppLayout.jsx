import Brand from '../common/Brand.jsx';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';

const menu = [
  ['/', 'Resumen', '⌂'],
  ['/clientes', 'Registrar cliente', '+'],
  ['/pruebas', 'Pruebas gratuitas', '◷'],
  ['/asignaciones', 'Asignaciones', '↗'],
  ['/ventas', 'Registrar venta', '$'],
];

export default function AppLayout() {
  const { session, logout } = useAuth();
  const { pathname } = useLocation();
  const currentTitle = menu.find(([path]) => path === pathname)?.[1] || 'Resumen';
  return <div className="app-shell">
    <aside className="sidebar">
      <Brand />
      <div className="workspace-label">ESPACIO DE TRABAJO</div>
      <nav>{menu.map(([path, label, icon]) => <NavLink key={path} to={path} end={path === '/'} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}><span className="nav-icon">{icon}</span>{label}</NavLink>)}</nav>
      <div className="sidebar-bottom"><div className="online-dot" /> Sistema conectado</div>
    </aside>
    <main className="main-area">
      <header className="topbar"><div className="crumb">CRM <span>/</span> {currentTitle}</div><div className="account"><div className="avatar">{session.user.email?.[0]?.toUpperCase()}</div><div className="account-copy"><strong>{session.user.email}</strong><small>{session.user.role}</small></div><button className="logout" onClick={logout}>Salir</button></div></header>
      <div className="page-content"><Outlet /></div>
    </main>
  </div>;
}
