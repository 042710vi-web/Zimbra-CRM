import Brand from '../common/Brand.jsx';

const menu = [
  ['overview', 'Resumen', '⌂'],
  ['clients', 'Registrar cliente', '+'],
  ['trials', 'Pruebas gratuitas', '◷'],
  ['assignments', 'Asignaciones', '↗'],
  ['sales', 'Registrar venta', '$'],
];

export default function AppLayout({ page, setPage, session, onLogout, children }) {
  const currentTitle = menu.find(([id]) => id === page)?.[1] || 'Resumen';
  return <div className="app-shell">
    <aside className="sidebar">
      <Brand />
      <div className="workspace-label">ESPACIO DE TRABAJO</div>
      <nav>{menu.map(([id, label, icon]) => <button key={id} className={`nav-item ${page === id ? 'active' : ''}`} onClick={() => setPage(id)}><span className="nav-icon">{icon}</span>{label}</button>)}</nav>
      <div className="sidebar-bottom"><div className="online-dot" /> Sistema conectado</div>
    </aside>
    <main className="main-area">
      <header className="topbar"><div className="crumb">CRM <span>/</span> {currentTitle}</div><div className="account"><div className="avatar">{session.user.email?.[0]?.toUpperCase()}</div><div className="account-copy"><strong>{session.user.email}</strong><small>{session.user.role}</small></div><button className="logout" onClick={onLogout}>Salir</button></div></header>
      <div className="page-content">{children}</div>
    </main>
  </div>;
}
