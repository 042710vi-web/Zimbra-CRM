import { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth.js';
import { useApiAction } from '../../hooks/useApiAction.js';
import { createAssignment, listAssignments } from '../../services/asignaciones.service.js';
import { listVendors } from '../../services/vendedores.service.js';
import Field from '../../components/common/Field.jsx';
import Notice from '../../components/common/Notice.jsx';

// HU-23: asignar clientes a vendedores responsables.
// Endpoint: POST /api/assignments (consumido por asignaciones.service.js).
export default function AsignacionesPage({ suggestedClientId }) {
  const { session } = useAuth();
  const { busy, notice, run } = useApiAction();
  const [form, setForm] = useState({ id_cliente: '', id_vendedor: '' });
  const [assignments, setAssignments] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [listError, setListError] = useState('');
  const [listBusy, setListBusy] = useState(true);
  const isAdmin = session.user.role === 'Administrador';

  async function refreshAssignments() {
    setListBusy(true);
    setListError('');
    try {
      const result = await listAssignments(session.token, { page: 1, limit: 50 });
      setAssignments(result.data);
    } catch (error) {
      setListError(error.message);
    } finally { setListBusy(false); }
  }

  useEffect(() => {
    refreshAssignments();
    if (isAdmin) listVendors(session.token, { page: 1, limit: 100 }).then((result) => setVendors(result.data)).catch(() => {});
  }, [session.token, isAdmin]);

  useEffect(() => {
    if (suggestedClientId && !form.id_cliente) setForm((current) => ({ ...current, id_cliente: String(suggestedClientId) }));
  }, [suggestedClientId, form.id_cliente]);

  async function submit(event) {
    event.preventDefault();
    const result = await run(() => createAssignment(session.token, { id_cliente: Number(form.id_cliente), id_vendedor: Number(form.id_vendedor) }));
    if (result) {
      setForm({ id_cliente: '', id_vendedor: '' });
      await refreshAssignments();
    }
  }

  return <><div className="page-heading"><div><span className="eyebrow">EQUIPO COMERCIAL</span><h1>Asignar prospecto</h1><p>Conecta un cliente con el vendedor que hará seguimiento.</p></div></div><Notice notice={notice} />
    {isAdmin ? <form className="form-card narrow" onSubmit={submit}><div className="notice info">Al asignar, la asignación activa anterior del cliente pasa a historial.</div>
      <Field label="ID del cliente *" type="number" min="1" required value={form.id_cliente} onChange={(event) => setForm({ ...form, id_cliente: event.target.value })} placeholder="Ej. 24" />
      {vendors.length ? <Field label="Vendedor *"><select required value={form.id_vendedor} onChange={(event) => setForm({ ...form, id_vendedor: event.target.value })}><option value="">Selecciona un vendedor</option>{vendors.map((vendor) => <option key={vendor.id_vendedor} value={vendor.id_vendedor}>{vendor.nombre_vendedor}</option>)}</select></Field> : <Field label="ID del vendedor *" type="number" min="1" required value={form.id_vendedor} onChange={(event) => setForm({ ...form, id_vendedor: event.target.value })} placeholder="Ej. 3" />}
      <div className="form-actions"><span className="muted">Solo administradores pueden asignar clientes.</span><button className="button primary" disabled={busy}>{busy ? 'Asignando…' : 'Asignar cliente'} <span>→</span></button></div>
    </form> : <div className="form-card narrow"><div className="notice info">Las asignaciones las gestiona un usuario con rol Administrador.</div></div>}
    <div className="section-title clients-list-heading"><div><h2>Asignaciones CRM</h2><p>Prospectos a tu cargo e historial de responsables.</p></div><span className="count-chip">{assignments.length} registros</span></div>
    {listError && <div className="notice error" role="alert">{listError}</div>}
    <section className="client-list-card"><div className="client-table-wrap"><table className="client-table"><thead><tr><th>Cliente</th><th>Vendedor</th><th>Asignada</th><th>Finalizada</th><th>Estado</th></tr></thead><tbody>
      {assignments.map((item) => <tr key={item.id_asignacion}><td><strong>{item.nombre_completo}</strong><small>Asignación #{item.id_asignacion}</small></td><td>{item.nombre_vendedor}</td><td>{item.fecha_asignacion ? new Date(item.fecha_asignacion).toLocaleDateString() : '—'}</td><td>{item.fecha_fin ? new Date(item.fecha_fin).toLocaleDateString() : '—'}</td><td><span className="client-status">{item.estado}</span></td></tr>)}
      {!listBusy && assignments.length === 0 && <tr><td colSpan="5" className="client-empty">No hay asignaciones para mostrar.</td></tr>}
      {listBusy && <tr><td colSpan="5" className="client-empty">Cargando asignaciones…</td></tr>}
    </tbody></table></div></section>
    {isAdmin && <><div className="section-title"><div><h2>Equipo de ventas</h2><p>Vendedores disponibles para asignación.</p></div><span className="count-chip">{vendors.length} vendedores</span></div><section className="client-list-card"><div className="client-table-wrap"><table className="client-table"><thead><tr><th>Vendedor</th><th>Correo</th><th>Estado</th></tr></thead><tbody>{vendors.map((vendor) => <tr key={vendor.id_vendedor}><td><strong>{vendor.nombre_vendedor}</strong><small>#{vendor.id_vendedor}</small></td><td>{vendor.correo_vendedor}</td><td><span className="client-status">{vendor.estado ? 'Activo' : 'Inactivo'}</span></td></tr>)}{vendors.length === 0 && <tr><td colSpan="3" className="client-empty">No hay vendedores para mostrar.</td></tr>}</tbody></table></div></section></>}
  </>;
}
