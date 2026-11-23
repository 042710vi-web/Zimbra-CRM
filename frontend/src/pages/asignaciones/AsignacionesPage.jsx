import { formatDateTime } from '../../utils/formatters.js';
import PagedTable, { TablePagination } from '../../components/common/PagedTable.jsx';
import { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth.js';
import { useApiAction } from '../../hooks/useApiAction.js';
import { createAssignment, createAssignmentsBatch, finishAssignment, listAssignments, reassignClient, takeProspect } from '../../services/asignaciones.service.js';
import { allOptions } from '../../services/modulos.service.js';
import Field from '../../components/common/Field.jsx';
import Notice from '../../components/common/Notice.jsx';

// HU-21: asignar clientes a vendedores responsables.
// Endpoint: POST /api/assignments (consumido por asignaciones.service.js).
export default function AsignacionesPage({ suggestedClientId }) {
  const { session } = useAuth();
  const { busy, notice, run } = useApiAction();
  const [form, setForm] = useState({ id_cliente: '', id_vendedor: '' });
  const [assignments, setAssignments] = useState([]);
  const [tablePage, setTablePage] = useState(1);
  const [tableSize, setTableSize] = useState(10);
  const [tableMeta, setTableMeta] = useState({ total: 0, pages: 1 });
  const [workload, setWorkload] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [listError, setListError] = useState('');
  const [listBusy, setListBusy] = useState(true);
  const [batchForm, setBatchForm] = useState({ ids: '', id_vendedor: '' });
  const [takeId, setTakeId] = useState('');
  const [activeTable, setActiveTable] = useState('assignments');
  const tableTabs = [['assignments', 'Asignaciones CRM'], ['workload', 'Carga por vendedor'], ['team', 'Equipo de ventas']];
  const isAdmin = session.user.role === 'Administrador';

  async function refreshAssignments(nextPage = tablePage) {
    setListBusy(true);
    setListError('');
    try {
      const result = await listAssignments(session.token, { page: nextPage, limit: tableSize });
      setAssignments(result.data);
      setTablePage(nextPage);
      setTableMeta(result.pagination || result);
      setWorkload(result.carga || []);
    } catch (error) {
      setListError(error.message);
    } finally { setListBusy(false); }
  }

  useEffect(() => {
    refreshAssignments(1);
    if (isAdmin) allOptions(session.token, '/vendors').then(setVendors).catch(() => {});
  }, [session.token, isAdmin, tableSize]);

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
  async function submitBatch(event) {
    event.preventDefault();
    const ids = batchForm.ids.split(',').map((value) => Number(value.trim())).filter(Boolean);
    const result = await run(() => createAssignmentsBatch(session.token, { id_clientes: ids, id_vendedor: Number(batchForm.id_vendedor) }));
    if (result) { setBatchForm({ ids: '', id_vendedor: '' }); await refreshAssignments(); }
  }
  async function submitTake(event) {
    event.preventDefault();
    const result = await run(() => takeProspect(session.token, Number(takeId)));
    if (result) { setTakeId(''); await refreshAssignments(); }
  }
  async function changeOwner(item) {
    const id_vendedor = Number(window.prompt('ID del nuevo vendedor activo'));
    if (!id_vendedor) return;
    const result = await run(() => reassignClient(session.token, { id_cliente: item.id_cliente, id_vendedor }));
    if (result) await refreshAssignments();
  }
  async function finish(item) {
    const result = await run(() => finishAssignment(session.token, item.id_asignacion));
    if (result) await refreshAssignments();
  }

  return <div className="assignments-page"><div className="page-heading"><div><span className="eyebrow">EQUIPO COMERCIAL</span><h1>Asignar prospecto</h1><p>Conecta un cliente con el vendedor que hará seguimiento.</p></div></div><Notice notice={notice} />
    {isAdmin ? <form className="form-card narrow" onSubmit={submit}><div className="notice info">La asignación individual requiere que el cliente no tenga otro responsable activo. Usa Reasignar para conservar el historial.</div>
      <Field label="ID del cliente *" type="number" min="1" required value={form.id_cliente} onChange={(event) => setForm({ ...form, id_cliente: event.target.value })} placeholder="Ej. 24" />
      {vendors.length ? <Field label="Vendedor *"><select required value={form.id_vendedor} onChange={(event) => setForm({ ...form, id_vendedor: event.target.value })}><option value="">Selecciona un vendedor</option>{vendors.map((vendor) => <option key={vendor.id_vendedor} value={vendor.id_vendedor}>{vendor.nombre_vendedor}</option>)}</select></Field> : <Field label="ID del vendedor *" type="number" min="1" required value={form.id_vendedor} onChange={(event) => setForm({ ...form, id_vendedor: event.target.value })} placeholder="Ej. 3" />}
      <div className="form-actions"><span className="muted">Solo administradores pueden asignar clientes.</span><button className="button primary" disabled={busy}>{busy ? 'Asignando…' : 'Asignar cliente'} <span>→</span></button></div>
    </form> : <div className="form-card narrow"><div className="notice info">Las asignaciones las gestiona un usuario con rol Administrador.</div><form className="take-prospect-form" onSubmit={submitTake}><Field label="ID del prospecto calificado" type="number" min="1" required value={takeId} onChange={(e) => setTakeId(e.target.value)} /><button className="button primary" disabled={busy}>Tomar prospecto</button></form></div>}
    {isAdmin && <form className="form-card narrow batch-assignment-form" onSubmit={submitBatch}><h2>Asignar por lote</h2><Field label="IDs de clientes calificados (separados por coma)" required value={batchForm.ids} onChange={(e) => setBatchForm({ ...batchForm, ids: e.target.value })} placeholder="12, 18, 25" /><Field label="ID del vendedor" type="number" min="1" required value={batchForm.id_vendedor} onChange={(e) => setBatchForm({ ...batchForm, id_vendedor: e.target.value })} /><button className="button primary" disabled={busy}>Asignar lote</button></form>}
    {isAdmin && <div className="assignment-tabs" role="tablist" aria-label="Tablas de asignaciones" onKeyDown={(event) => {
      const keys = ['ArrowLeft', 'ArrowRight', 'Home', 'End'];
      if (!keys.includes(event.key)) return;
      event.preventDefault();
      const current = tableTabs.findIndex(([key]) => key === activeTable);
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? tableTabs.length - 1 : (current + (event.key === 'ArrowRight' ? 1 : -1) + tableTabs.length) % tableTabs.length;
      setActiveTable(tableTabs[next][0]);
      event.currentTarget.querySelectorAll('[role="tab"]')[next].focus();
    }}>{tableTabs.map(([key, label]) => <button type="button" key={key} id={`assignment-tab-${key}`} role="tab" aria-selected={activeTable === key} aria-controls={`assignment-panel-${key}`} tabIndex={activeTable === key ? 0 : -1} onClick={() => setActiveTable(key)}>{label}</button>)}</div>}
    <div className="section-title clients-list-heading"><div><h2>{!isAdmin || activeTable === 'assignments' ? 'Asignaciones CRM' : activeTable === 'workload' ? 'Carga por vendedor' : 'Equipo de ventas'}</h2><p>{!isAdmin || activeTable === 'assignments' ? 'Prospectos a tu cargo e historial de responsables.' : activeTable === 'workload' ? 'Clientes activos e historial finalizado por vendedor.' : 'Vendedores disponibles para asignación.'}</p></div><span className="count-chip">{!isAdmin || activeTable === 'assignments' ? `${tableMeta.total || 0} registros` : activeTable === 'workload' ? `${workload.length} vendedores` : `${vendors.length} vendedores`}</span></div>
    {isAdmin && activeTable === 'workload' && <section className="client-list-card" id="assignment-panel-workload" role="tabpanel" aria-labelledby="assignment-tab-workload"><div className="client-table-wrap"><PagedTable className="client-table assignment-workload-table"><thead><tr><th>Carga por vendedor</th><th>Clientes activos</th><th>Historial finalizado</th></tr></thead><tbody>{workload.map((row) => <tr key={row.id_vendedor}><td>{row.nombre_vendedor}</td><td>{row.clientes_activos}</td><td>{row.asignaciones_finalizadas}</td></tr>)}</tbody></PagedTable></div></section>}
    {listError && <div className="notice error" role="alert">{listError}</div>}
    {(!isAdmin || activeTable === 'assignments') && <section className="client-list-card" id="assignment-panel-assignments" role={isAdmin ? 'tabpanel' : undefined} aria-labelledby={isAdmin ? 'assignment-tab-assignments' : undefined}><div className="client-table-wrap"><PagedTable managed className="client-table balanced-table balanced-actions-table assignment-history-table"><thead><tr><th>Cliente</th><th>Vendedor</th><th>Asignada</th><th>Finalizada</th><th>Estado</th>{isAdmin && <th className="assignment-actions-cell">Acciones</th>}</tr></thead><tbody>
      {assignments.map((item) => <tr key={item.id_asignacion}><td><strong>{item.nombre_completo}</strong><small>Asignación #{item.id_asignacion}</small></td><td>{item.nombre_vendedor}</td><td>{formatDateTime(item.fecha_asignacion)}</td><td>{formatDateTime(item.fecha_fin)}</td><td><span className="client-status">{item.estado}</span></td>{isAdmin && <td className="assignment-actions-cell">{item.estado === 'Activa' && <div className="table-actions assignment-actions"><button className="button action-button" onClick={() => changeOwner(item)}>Reasignar</button><button className="button" onClick={() => finish(item)}>Finalizar</button></div>}</td>}</tr>)}
      {!listBusy && assignments.length === 0 && <tr><td colSpan={isAdmin ? 6 : 5} className="client-empty">No hay asignaciones para mostrar.</td></tr>}
      {listBusy && <tr><td colSpan={isAdmin ? 6 : 5} className="client-empty">Cargando asignaciones…</td></tr>}
    </tbody></PagedTable></div><TablePagination page={tablePage} pages={tableMeta.pages || tableMeta.totalPages} total={tableMeta.total} size={tableSize} onSize={(value) => { setTablePage(1); setTableSize(value); }} onPage={refreshAssignments} disabled={listBusy} /></section>}
    {isAdmin && activeTable === 'team' && <section className="client-list-card" id="assignment-panel-team" role="tabpanel" aria-labelledby="assignment-tab-team"><div className="client-table-wrap"><PagedTable className="client-table assignment-team-table"><thead><tr><th>Vendedor</th><th>Correo</th><th>Estado</th></tr></thead><tbody>{vendors.map((vendor) => <tr key={vendor.id_vendedor}><td><strong>{vendor.nombre_vendedor}</strong><small>#{vendor.id_vendedor}</small></td><td>{vendor.correo_vendedor}</td><td><span className="client-status">{vendor.estado ? 'Activo' : 'Inactivo'}</span></td></tr>)}{vendors.length === 0 && <tr><td colSpan="3" className="client-empty">No hay vendedores para mostrar.</td></tr>}</tbody></PagedTable></div></section>}
  </div>;
}
