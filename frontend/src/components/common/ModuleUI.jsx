import { normalizeSearchValue } from '../../utils/search.js';
import PagedTable, { TablePagination } from './PagedTable.jsx';
import { formatDisplayValue } from '../../utils/formatters.js';
import { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useModuleQuery } from '../../hooks/useModuleQuery.js';
import { pageInfo } from '../../services/modulos.service.js';

export function PageHeading({ eyebrow, title, children, actions }) {
  return <div className="page-heading"><div>{eyebrow && <span className="eyebrow">{eyebrow}</span>}<h1>{title}</h1><p>{children}</p></div>{actions}</div>;
}
export function QueryError({ error, retry }) { return error ? <div className="notice error" role="alert">{error} {retry && <button type="button" className="text-button action-button" onClick={retry}>Reintentar consulta</button>}</div> : null; }
export function Status({ value }) {
  const text = typeof value === 'boolean' || value === 0 || value === 1 ? (value ? 'Activo' : 'Inactivo') : value;
  return <span className={`status-chip ${['Activa', 'Activo', 'Calificado', 'Cliente', 'Convertido', 'Atendida'].includes(text) ? 'positive' : ['Inactivo', 'Inactiva', 'Vencida', 'Descartado'].includes(text) ? 'negative' : 'neutral'}`}>{text || '—'}</span>;
}
export function Score({ value = 0 }) { return <span className="score-cell"><strong>{value} pts</strong><span className="score-track" aria-hidden="true"><i style={{ width: `${Math.min(100, Math.max(0, Number(value)))}%` }} /></span></span>; }
export function ModuleTable({ columns, rows = [], loading, rowKey = 'id', rowClass, tableClassName = '', managed = false, empty = 'No hay registros para estos filtros.' }) {
  return <div className="client-list-card"><div className="client-table-wrap"><PagedTable managed={managed} className={`client-table module-table ${tableClassName}`}><thead><tr>{columns.map((column) => <th key={column.key} scope="col">{column.label}</th>)}</tr></thead><tbody>{loading ? <tr><td colSpan={columns.length} className="client-empty" role="status">Cargando…</td></tr> : rows.map((row, index) => <tr key={row[rowKey] ?? index} className={rowClass?.(row)}>{columns.map((column) => <td key={column.key} data-sort-value={column.sortValue ? column.sortValue(row) : row[column.key]}>{column.render ? column.render(row) : formatDisplayValue(row[column.key], column.key, row)}</td>)}</tr>)}{!loading && !rows.length && <tr><td colSpan={columns.length} className="client-empty">{empty}</td></tr>}</tbody></PagedTable></div></div>;
}
export function Pagination({ result, page, onPage, disabled, size = 10, onSize }) {
  const meta = pageInfo(result, page);
  return <TablePagination page={page} pages={meta.pages} total={meta.total} size={size} onPage={onPage} onSize={onSize} disabled={disabled} />;
}
export function ActionDialog({ title, children, onClose, onSubmit, busy, confirm = 'Confirmar', error }) {
  const ref = useRef(null);
  useEffect(() => { const dialog = ref.current; const previous = document.activeElement; dialog.showModal(); return () => { dialog.close(); previous?.focus(); }; }, []);
  return <dialog ref={ref} className="action-dialog" onCancel={(event) => { event.preventDefault(); if (!busy) onClose(); }} aria-labelledby="action-dialog-title"><form onSubmit={(event) => { event.preventDefault(); onSubmit(); }}><h2 id="action-dialog-title">{title}</h2>{children}{error && <div className="notice error" role="alert">{error}</div>}<div className="form-actions"><button type="button" className="button action-button" disabled={busy} onClick={onClose}>Cancelar</button><button className="button primary" disabled={busy}>{busy ? 'Procesando…' : confirm}</button></div></form></dialog>;
}
export function ClientLookup({ value, onChange, label = 'Cliente', required = false, excludeInactive = false }) {
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [selected, setSelected] = useState(null);
  const listId = useId();
  useEffect(() => { if (!value) { setSelected(null); setQuery(''); setDebounced(''); setPage(1); setOpen(false); setActive(-1); } }, [value]);
  useEffect(() => { const timer = setTimeout(() => { setDebounced(query.trim()); setPage(1); }, 250); return () => clearTimeout(timer); }, [query]);
  const request = useModuleQuery('/clients', { q: debounced, page, limit: 10 });
  const rows = Array.isArray(request.data?.data) ? request.data.data : [];
  const pending = query.trim() !== debounced || request.loading;
  const showResults = open && query.trim().length > 0;
  function clearSearch() { setQuery(''); setDebounced(''); setPage(1); setOpen(false); setActive(-1); }
  function choose(row) {
    if (excludeInactive && row.estado_cliente === 'Inactivo') return;
    setSelected(row); onChange(String(row.id_cliente)); clearSearch();
  }
  function navigate(event) {
    if (event.key === 'Escape') { setOpen(false); setActive(-1); return; }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault(); setOpen(true);
      const available = rows.map((row, index) => ({ row, index })).filter(({ row }) => !excludeInactive || row.estado_cliente !== 'Inactivo');
      if (!available.length || pending) return;
      const current = available.findIndex(({ index }) => index === active);
      const next = event.key === 'ArrowDown' ? (current + 1) % available.length : (current <= 0 ? available.length - 1 : current - 1);
      setActive(available[next].index);
    }
    if (event.key === 'Enter' && showResults) {
      event.preventDefault();
      if (!pending && active >= 0 && rows[active]) choose(rows[active]);
    }
  }
  return <div className="lookup-field"><label className="field lookup-search-field">Buscar cliente<input type="search" role="combobox" autoComplete="off" aria-autocomplete="list" aria-expanded={showResults} aria-controls={listId} aria-activedescendant={showResults && !pending && active >= 0 ? `${listId}-${active}` : undefined} value={normalizeSearchValue(query)} onFocus={() => setOpen(true)} onBlur={(event) => { if (!event.currentTarget.parentElement.contains(event.relatedTarget)) setOpen(false); }} onKeyDown={navigate} onChange={(event) => { setQuery(normalizeSearchValue(event.target.value)); setOpen(true); setActive(-1); setPage(1); }} placeholder="Nombre, correo o empresa" />{showResults && <div className="lookup-results"><div id={listId} role="listbox" aria-label="Clientes encontrados">{!pending && !request.error && rows.map((row, index) => <button type="button" role="option" id={`${listId}-${index}`} key={row.id_cliente} aria-selected={active === index} disabled={excludeInactive && row.estado_cliente === 'Inactivo'} onMouseDown={(event) => event.preventDefault()} onClick={() => choose(row)}><strong>{row.nombre_completo}</strong><small>{row.correo_electronico}{row.nombre_empresa ? ` · ${row.nombre_empresa}` : ''}</small><small>{row.estado_cliente} · #{row.id_cliente}</small></button>)}</div>{pending ? <p role="status">Buscando clientes…</p> : request.error ? <p role="alert">{request.error}</p> : !rows.length && <p role="status">No se encontraron clientes para esta búsqueda.</p>}</div>}</label><label className="field">{label}<select required={required} value={value} onChange={(event) => { const row = rows.find((item) => String(item.id_cliente) === event.target.value); setSelected(row || null); onChange(event.target.value); clearSearch(); }}><option value="">Selecciona un cliente</option>{value && !rows.some((row) => String(row.id_cliente) === String(value)) && <option value={value}>{selected && String(selected.id_cliente) === String(value) ? `${selected.nombre_completo} · ${selected.estado_cliente} · #${value}` : `Cliente #${value}`}</option>}{rows.map((row) => <option key={row.id_cliente} value={row.id_cliente} disabled={excludeInactive && row.estado_cliente === 'Inactivo'}>{row.nombre_completo} · {row.estado_cliente} · #{row.id_cliente}</option>)}</select></label><QueryError error={request.error} retry={request.reload} /><div className="lookup-navigation"><button type="button" className="text-button" disabled={pending || page <= 1} onClick={() => { setPage((current) => current - 1); setActive(-1); }}>Anteriores</button><span>{pending ? 'Buscando…' : `Página ${page} de ${pageInfo(request.data).pages}`}</span><button type="button" className="text-button" disabled={pending || page >= pageInfo(request.data).pages} onClick={() => { setPage((current) => current + 1); setActive(-1); }}>Más clientes</button></div></div>;
}
export function ClientLink({ id, children }) { return <Link className="table-link" to={`/actividad?id_cliente=${id}`}>{children || `Cliente #${id}`}</Link>; }
