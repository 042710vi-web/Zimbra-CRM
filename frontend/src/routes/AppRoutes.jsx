import { useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import AppLayout from '../components/layout/AppLayout.jsx';
import LoginPage from '../pages/login/LoginPage.jsx';
import DashboardPage from '../pages/dashboard/DashboardPage.jsx';
import ClientesPage from '../pages/clientes/ClientesPage.jsx';
import DescargasPage from '../pages/descargas/DescargasPage.jsx';
import AsignacionesPage from '../pages/asignaciones/AsignacionesPage.jsx';
import VentasPage from '../pages/ventas/VentasPage.jsx';
import RecuperarPasswordPage from '../pages/login/RecuperarPasswordPage.jsx';
import RestablecerPasswordPage from '../pages/login/RestablecerPasswordPage.jsx';
import InteraccionesPage from '../pages/interacciones/InteraccionesPage.jsx';
import ReportesPage from '../pages/reportes/ReportesPage.jsx';
import AutomatizacionPage from '../pages/automatizacion/AutomatizacionPage.jsx';
import VendedoresPage from '../pages/vendedores/VendedoresPage.jsx';
import { EmpresasPage, SeguimientoPage } from '../pages/gestion/GestionPages.jsx';
import { ProductosPage, CampanasPage, AccionesPage } from '../pages/catalogos/CatalogosPage.jsx';
import ActividadPage from '../pages/actividad/ActividadPage.jsx';
import CalificacionPage from '../pages/calificacion/CalificacionPage.jsx';
import AlertasPage from '../pages/alertas/AlertasPage.jsx';
import PublicSitePage from '../pages/public/PublicSitePage.jsx';

function ProtectedLayout() {
  const { session } = useAuth();
  if (!session?.token || !session?.user) return <Navigate to="/equipo" replace />;
  return <AppLayout />;
}

function LoginRoute() {
  const { session } = useAuth();
  return session?.token && session?.user ? <Navigate to="/crm" replace /> : <LoginPage />;
}

function CrmRoutes() {
  const { session } = useAuth();
  const [suggestedClientId, setSuggestedClientId] = useState(null);
  return <Routes>
    <Route path="/recuperar" element={<RecuperarPasswordPage />} />
    <Route path="/restablecer" element={<RestablecerPasswordPage />} />
    <Route path="/login" element={<Navigate to="/" replace />} />
    <Route path="/equipo" element={<LoginRoute />} />
    <Route path="/" element={<PublicSitePage />} />
    <Route path="/solicitar-prueba" element={<PublicSitePage />} />
    <Route element={<ProtectedLayout />}>
      <Route path="/crm" element={<DashboardPage />} />
      <Route path="/clientes" element={<ClientesPage onCreated={setSuggestedClientId} />} />
      <Route path="/empresas" element={<EmpresasPage />} />
      <Route path="/productos" element={<ProductosPage />} />
      <Route path="/actividad" element={<ActividadPage />} />
      <Route path="/alertas" element={<AlertasPage />} />
      {session?.user?.role === 'Administrador' && <Route path="/campanas" element={<CampanasPage />} />}
      {session?.user?.role === 'Administrador' && <Route path="/acciones" element={<AccionesPage />} />}
      {session?.user?.role === 'Administrador' && <Route path="/calificacion" element={<CalificacionPage />} />}
      {session?.user?.role === 'Administrador' && <Route path="/auditoria" element={<SeguimientoPage key="audit" mode="audit" />} />}
      {session?.user?.role === 'Administrador' && <Route path="/salesforce" element={<SeguimientoPage key="sync" mode="sync" />} />}
      <Route path="/pruebas" element={<DescargasPage suggestedClientId={suggestedClientId} />} />
      <Route path="/asignaciones" element={<AsignacionesPage suggestedClientId={suggestedClientId} />} />
      <Route path="/ventas" element={<VentasPage suggestedClientId={suggestedClientId} />} />
      <Route path="/interacciones" element={<InteraccionesPage />} />
      {session?.user?.role === 'Administrador' && <Route path="/reportes" element={<ReportesPage />} />}
      {session?.user?.role === 'Administrador' && <Route path="/plantillas" element={<AutomatizacionPage />} />}
      {session?.user?.role === 'Administrador' && <Route path="/vendedores" element={<VendedoresPage />} />}
    </Route>
    <Route path="*" element={<Navigate to={session?.token ? '/crm' : '/'} replace />} />
  </Routes>;
}

export default function AppRoutes() {
  return <BrowserRouter><CrmRoutes /></BrowserRouter>;
}
