import { useModuleQuery } from '../../hooks/useModuleQuery.js';
import PagedTable, { TablePagination } from '../../components/common/PagedTable.jsx';
import { formatDisplayValue } from '../../utils/formatters.js';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../hooks/useAuth.js';
import { downloadReport, getReport } from '../../services/reportes.service.js';

const REPORTS = [
  ['sales', 'Ventas'], ['clients', 'Clientes'], ['campaigns', 'Campañas'], ['interactions', 'Interacciones'], ['assignments', 'Asignaciones'], ['automation', 'Automatización'], ['indicators', 'Indicadores integrados'],
];
const today = new Date().toISOString().slice(0, 10);
const monthStart = `${today.slice(0, 7)}-01`;
const labelize = (value) => value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

const indicatorCounts = { ventas_periodo: 'ventas', vendedores_historico_y_actual: 'vendedores', clientes_actuales: 'clientes', productos_actuales: 'productos', interacciones_historicas: 'interacciones', correos_historicos: 'correos' };

function ReportTable({ section, rows, kind, desde, hasta, total }) {
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);
  const managed = total !== undefined;
  const query = useModuleQuery(`/reports/${kind}`, { desde, hasta, page, limit: size }, { enabled: managed });
  const data = managed ? query.data?.[section] || rows : rows;
  const columns = [...new Set(data.flatMap((row) => Object.keys(row || {})))];
  return <div><div className="section-title"><div><h2>{labelize(section)}</h2><p>{managed ? total : rows.length} registro(s)</p></div></div>{query.error && <div className="notice error" role="alert">{query.error}</div>}<section className="client-list-card"><div className="client-table-wrap"><PagedTable managed={managed} className="client-table"><thead><tr>{columns.map((column) => <th key={column}>{labelize(column)}</th>)}</tr></thead><tbody>{data.map((row, index) => <tr key={`${row.id_cliente || row.id_venta || row.id_vendedor || 'row'}-${index}`}>{columns.map((column) => <td key={column}>{typeof row[column] === 'boolean' ? (row[column] ? 'Sí' : 'No') : formatDisplayValue(row[column], column, row)}</td>)}</tr>)}{data.length === 0 && <tr><td colSpan={Math.max(columns.length, 1)} className="client-empty">Sin registros para esta sección y página.</td></tr>}</tbody></PagedTable></div>{managed && <TablePagination page={page} size={size} total={total} pages={Math.ceil(total / size)} onPage={setPage} onSize={(value) => { setPage(1); setSize(value); }} disabled={query.loading} />}</section></div>;
}

export default function ReportesPage() {
  const { session, logout } = useAuth();
  const [kind, setKind] = useState('sales');
  const [reportChoice, setReportChoice] = useState('sales');
  const pendingChoiceReset = useRef(null);
  const [desde, setDesde] = useState(monthStart);
  const [hasta, setHasta] = useState(today);
  const [report, setReport] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);

  function load(event) { event.preventDefault(); if (!reportChoice) return; pendingChoiceReset.current = reportChoice; setKind(reportChoice); setRevision((value) => value + 1); }
  async function exportCsv() { try { const blob = await downloadReport(session.token, kind, { desde, hasta, ...(['indicators', 'interactions'].includes(kind) ? { page: 1, limit: 10 } : {}) }); const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = `reporte-${kind}.csv`; anchor.click(); URL.revokeObjectURL(url); setReportChoice(''); } catch (cause) { if (cause.status === 401) logout(); setError(cause.message); } }

  useEffect(() => {
    let active = true;
    setBusy(true); setError(''); setReport(null);
    if (desde && hasta && desde > hasta) { setError('Desde no puede ser posterior a Hasta.'); setBusy(false); return; }
    getReport(session.token, kind, { desde, hasta, ...(['indicators', 'interactions'].includes(kind) ? { page: 1, limit: 10 } : {}) })
      .then((data) => { if (active) { setReport(data); if (pendingChoiceReset.current === kind) { setReportChoice((current) => current === kind ? '' : current); pendingChoiceReset.current = null; } } })
      .catch((cause) => { if (active) { pendingChoiceReset.current = null; if (cause.status === 401) logout(); setError(cause.message); } })
      .finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [session.token, logout, kind, desde, hasta, revision]);
  const arrays = report ? Object.entries(report).filter(([, value]) => Array.isArray(value)) : [];
  const metrics = report ? Object.entries(report).filter(([key, value]) => key !== 'filtros' && key !== 'pagination' && !Array.isArray(value) && (typeof value !== 'object' || value === null)) : [];
  const summary = report ? Object.entries(report)
    .filter(([key, value]) => !['filtros', 'pagination'].includes(key) && value && typeof value === 'object' && !Array.isArray(value))
    .flatMap(([section, values]) => Object.entries(values).map(([key, value]) => [`${section}_${key}`, value])) : [];

  return <>
    <div className="page-heading"><div><span className="eyebrow">ANÁLISIS COMERCIAL</span><h1>Reportes</h1><p>Consulta resultados de ventas, clientes, campañas e interacciones.</p></div></div>
    <form className="report-filters form-card report-export-filters" onSubmit={load}>
      <label className="field">Reporte<select required value={reportChoice} onChange={(event) => { setReportChoice(event.target.value); if (event.target.value) setKind(event.target.value); }}><option value="">Selecciona un reporte</option>{REPORTS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label className="field">Desde<input type="date" max={hasta || undefined} value={desde} onChange={(event) => { setDesde(event.target.value); }} /></label>
      <label className="field">Hasta<input type="date" min={desde || undefined} value={hasta} onChange={(event) => { setHasta(event.target.value); }} /></label>
      <button className="button primary" disabled={busy}>{busy ? 'Consultando…' : 'Consultar'}</button>
      <button type="button" className="button" disabled={busy || !report || !!error} onClick={exportCsv}>{kind === 'indicators' ? 'Exportar página CSV' : 'Exportar CSV'}</button>
    </form>
    {error && <div className="notice error" role="alert">{error}</div>}
    {busy && <div className="client-empty">Cargando reporte…</div>}
    {report && !busy && <>
      {kind === 'indicators' && <div className="notice info">El ticket, las ventas y el rendimiento del periodo usan las fechas seleccionadas. Las secciones históricas acumulan todos los periodos; los datos actuales y las interacciones de los últimos 7 días se calculan al consultar.</div>}
      {(summary.length || metrics.length) > 0 && <div className="report-metrics">{[...summary, ...metrics].map(([key, value]) => <article className="report-metric" key={key}><span>{labelize(key)}</span><strong>{formatDisplayValue(value, key)}</strong></article>)}</div>}
      {arrays.map(([section, rows]) => <ReportTable key={`${kind}:${desde}:${hasta}:${revision}:${section}`} section={section} rows={rows} kind={kind} desde={desde} hasta={hasta} total={kind === 'indicators' && indicatorCounts[section] ? report.pagination?.totales?.[indicatorCounts[section]] : kind === 'interactions' && section === 'calificados_sin_seguimiento' ? report.pagination?.total : undefined} />)}
      {!arrays.length && !summary.length && !metrics.length && <div className="notice info">El reporte no contiene registros para mostrar.</div>}

    </>}
  </>;
}
