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

function ProtectedLayout() {
  const { session } = useAuth();
  if (!session?.token) return <Navigate to="/login" replace />;
  return <AppLayout />;
}

function LoginRoute() {
  const { session } = useAuth();
  return session?.token ? <Navigate to="/" replace /> : <LoginPage />;
}

function CrmRoutes() {
  const [suggestedClientId, setSuggestedClientId] = useState(null);
  return <Routes>
    <Route path="/login" element={<LoginRoute />} />
    <Route element={<ProtectedLayout />}>
      <Route path="/" element={<DashboardPage />} />
      <Route path="/clientes" element={<ClientesPage onCreated={setSuggestedClientId} />} />
      <Route path="/pruebas" element={<DescargasPage suggestedClientId={suggestedClientId} />} />
      <Route path="/asignaciones" element={<AsignacionesPage suggestedClientId={suggestedClientId} />} />
      <Route path="/ventas" element={<VentasPage suggestedClientId={suggestedClientId} />} />
    </Route>
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>;
}

export default function AppRoutes() {
  return <BrowserRouter><CrmRoutes /></BrowserRouter>;
}
