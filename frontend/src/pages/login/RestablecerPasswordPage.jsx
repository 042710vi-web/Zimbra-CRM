import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Brand from '../../components/common/Brand.jsx';
import { resetPassword } from '../../services/auth.service.js';

export default function RestablecerPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setBusy(true);
    try {
      await resetPassword({ token, password });
      setDone(true);
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
            Elige una<br />
            contraseña<br />
            <em>nueva.</em>
          </h1>
          <p>
            Protege tu cuenta y vuelve a gestionar tus relaciones comerciales.
          </p>
        </div>
        <div className="aside-foot">Plataforma de gestión de clientes</div>
      </section>

      <section className="login-content">
        <form className="login-card" onSubmit={submit}>
          <span className="eyebrow">NUEVA CONTRASEÑA</span>
          <h2>Restablecer contraseña</h2>
          <p className="muted">
            Usa mínimo 8 caracteres e incluye letras y números.
          </p>

          {!token && (
            <div className="notice error" role="alert">
              El enlace no tiene un token válido. Solicita uno nuevo.
            </div>
          )}

          {error && (
            <div className="notice error" role="alert">
              {error}
            </div>
          )}

          {done ? (
            <>
              <div className="notice success" role="status">
                Tu contraseña se actualizó correctamente.
              </div>
              <Link className="button primary full auth-button-link" to="/login">
                Ir a iniciar sesión <span>→</span>
              </Link>
            </>
          ) : (
            <>
              <label>
                Nueva contraseña
                <input
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  disabled={!token}
                />
              </label>

              <label>
                Confirmar contraseña
                <input
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Escribe de nuevo la contraseña"
                  disabled={!token}
                />
              </label>

              <button className="button primary full" disabled={busy || !token}>
                {busy ? 'Actualizando…' : 'Guardar contraseña'} <span>→</span>
              </button>

              {!token && (
                <p className="auth-back">
                  <Link to="/recuperar">Solicitar otro enlace</Link>
                </p>
              )}
            </>
          )}

          <p className="auth-back">
            <Link to="/login">← Volver a iniciar sesión</Link>
          </p>
        </form>
      </section>
    </main>
  );
}