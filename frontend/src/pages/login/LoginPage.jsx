import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth.js';
import Brand from '../../components/common/Brand.jsx';

// HU: pendiente de documentar al recibir las historias de usuario.
// Endpoint asociado: pendiente de confirmar con su historia de usuario.
export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(event) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try { await login({ email, password }); }
    catch (cause) { setError(cause.message); }
    finally { setBusy(false); }
  }

  return <main className="login-page">
    <section className="login-aside">
      <Brand />
      <div className="login-pitch"><span className="eyebrow">GESTIÓN COMERCIAL</span><h1>Relaciones que<br />se convierten en<br /><em>resultados.</em></h1><p>Administra prospectos, acompaña pruebas y registra ventas desde un solo lugar.</p></div>
      <div className="aside-foot">Plataforma de gestión de clientes</div>
    </section>
    <section className="login-content"><form className="login-card" onSubmit={submit}>
      <span className="eyebrow">BIENVENIDO DE NUEVO</span><h2>Inicia sesión</h2><p className="muted">Ingresa tus credenciales para continuar.</p>
      <label>Correo electrónico<input type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nombre@empresa.com" /></label>
      <label>Contraseña<input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Tu contraseña" /></label>
      {error && <div className="notice error" role="alert">{error}</div>}
      <button className="button primary full" disabled={busy}>{busy ? 'Ingresando…' : 'Ingresar'} <span>→</span></button>
      <small className="muted login-note">Acceso protegido con token de sesión.</small>
    </form></section>
  </main>;
}
