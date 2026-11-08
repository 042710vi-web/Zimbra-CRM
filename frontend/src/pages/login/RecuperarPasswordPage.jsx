import { useState } from 'react';
import { Link } from 'react-router-dom';
import Brand from '../../components/common/Brand.jsx';
import { requestPasswordReset } from '../../services/auth.service.js';

export default function RecuperarPasswordPage() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  async function submit(event) {
    event.preventDefault();
    setError('');
    setResult(null);
    setBusy(true);

    try {
      setResult(await requestPasswordReset(email.trim()));
    } catch (cause) {
      setError(cause.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-aside">
        <Brand />
        <div className="login-pitch">
          <span className="eyebrow">ACCESO SEGURO</span>
          <h1>
            Recupera el<br />
            acceso a tu<br />
            <em>cuenta.</em>
          </h1>
          <p>
            Te ayudaremos a crear una nueva contraseña para tu cuenta de Zimbra CRM.
          </p>
        </div>
        <div className="aside-foot">Plataforma de gestión de clientes</div>
      </section>

      <section className="login-content">
        <form className="login-card" onSubmit={submit}>
          <span className="eyebrow">RECUPERACIÓN DE CUENTA</span>
          <h2>¿Olvidaste tu contraseña?</h2>
          <p className="muted">
            Escribe el correo asociado a tu cuenta. Si existe, recibirás un enlace para restablecerla.
          </p>

          <label>
            Correo electrónico
            <input
              type="email"
              autoComplete="email"
              required
              maxLength={100}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="nombre@empresa.com"
            />
          </label>

          {error && (
            <div className="notice error" role="alert">
              {error}
            </div>
          )}

          {result && (
            <div className="notice success" role="status">
              {result.message}
              {result.resetUrl && (
                <span className="dev-reset-link">
                  Modo local:{' '}
                  <Link
                    to={
                      new URL(result.resetUrl).pathname +
                      new URL(result.resetUrl).search
                    }
                  >
                    Abrir enlace de recuperación
                  </Link>
                </span>
              )}
            </div>
          )}

          <button className="button primary full" disabled={busy}>
            {busy ? 'Enviando…' : 'Enviar enlace'} <span>→</span>
          </button>

          <p className="auth-back">
            <Link to="/login">← Volver a iniciar sesión</Link>
          </p>
        </form>
      </section>
    </main>
  );
}