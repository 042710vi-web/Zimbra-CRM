import { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth.js';
import { useApiAction } from '../../hooks/useApiAction.js';
import { createAssignment } from '../../services/asignaciones.service.js';
import Field from '../../components/common/Field.jsx';
import Notice from '../../components/common/Notice.jsx';

// HU-23: asignar clientes a vendedores responsables.
// Endpoint: POST /api/assignments (consumido por asignaciones.service.js).
export default function AsignacionesPage({ suggestedClientId }) {
  const { session } = useAuth();
  const { busy, notice, run } = useApiAction();
  const [form, setForm] = useState({ id_cliente: '', id_vendedor: '' });
  const isAdmin = session.user.role === 'Administrador';

  useEffect(() => {
    if (suggestedClientId && !form.id_cliente) setForm((current) => ({ ...current, id_cliente: String(suggestedClientId) }));
  }, [suggestedClientId, form.id_cliente]);

  async function submit(event) {
    event.preventDefault();
    const result = await run(() => createAssignment(session.token, { id_cliente: Number(form.id_cliente), id_vendedor: Number(form.id_vendedor) }));
    if (result) setForm({ id_cliente: '', id_vendedor: '' });
  }

  return <><div className="page-heading"><div><span className="eyebrow">EQUIPO COMERCIAL</span><h1>Asignar prospecto</h1><p>Conecta un cliente con el vendedor que hará seguimiento.</p></div></div><Notice notice={notice} />
    {isAdmin ? <form className="form-card narrow" onSubmit={submit}><div className="notice info">Al asignar, la asignación activa anterior del cliente pasa a historial.</div>
      <Field label="ID del cliente *" type="number" min="1" required value={form.id_cliente} onChange={(event) => setForm({ ...form, id_cliente: event.target.value })} placeholder="Ej. 24" />
      <Field label="ID del vendedor *" type="number" min="1" required value={form.id_vendedor} onChange={(event) => setForm({ ...form, id_vendedor: event.target.value })} placeholder="Ej. 3" />
      <div className="form-actions"><span className="muted">Solo administradores pueden asignar clientes.</span><button className="button primary" disabled={busy}>{busy ? 'Asignando…' : 'Asignar cliente'} <span>→</span></button></div>
    </form> : <div className="form-card narrow"><div className="notice info">Las asignaciones las gestiona un usuario con rol Administrador.</div></div>}
  </>;
}
