import DashboardPage from '../pages/dashboard/DashboardPage.jsx';
import ClientesPage from '../pages/clientes/ClientesPage.jsx';
import DescargasPage from '../pages/descargas/DescargasPage.jsx';
import AsignacionesPage from '../pages/asignaciones/AsignacionesPage.jsx';
import VentasPage from '../pages/ventas/VentasPage.jsx';

export default function AppRoutes({ page, session, setPage, suggestedClientId, onClientCreated }) {
  switch (page) {
    case 'clients': return <ClientesPage onCreated={onClientCreated} />;
    case 'trials': return <DescargasPage suggestedClientId={suggestedClientId} />;
    case 'assignments': return <AsignacionesPage suggestedClientId={suggestedClientId} />;
    case 'sales': return <VentasPage suggestedClientId={suggestedClientId} />;
    case 'overview':
    default: return <DashboardPage session={session} setPage={setPage} />;
  }
}
