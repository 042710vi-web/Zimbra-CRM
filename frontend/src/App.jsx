import { useState } from 'react';
import { AuthProvider } from './context/AuthContext.jsx';
import { useAuth } from './hooks/useAuth.js';
import AppLayout from './components/layout/AppLayout.jsx';
import LoginPage from './pages/login/LoginPage.jsx';
import AppRoutes from './routes/AppRoutes.jsx';

function Application() {
  const { session, logout } = useAuth();
  const [page, setPage] = useState('overview');
  const [suggestedClientId, setSuggestedClientId] = useState(null);

  if (!session?.token) return <LoginPage />;

  return <AppLayout page={page} setPage={(nextPage) => { setPage(nextPage); }} session={session} onLogout={logout}>
    <AppRoutes
      page={page}
      session={session}
      setPage={setPage}
      suggestedClientId={suggestedClientId}
      onClientCreated={setSuggestedClientId}
    />
  </AppLayout>;
}

export default function App() {
  return <AuthProvider><Application /></AuthProvider>;
}
