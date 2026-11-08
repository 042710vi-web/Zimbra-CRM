import { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth.js';
import { getReport } from '../../services/reportes.service.js';

const REPORTS = [
  ['sales', 'Ventas'], ['clients', 'Clientes'], ['campaigns', 'Campañas'], ['interactions', 'Interacciones'],
];
const today = new Date().toISOString().slice(0, 10);
const monthStart = `${today.slice(0, 7)}-01`;
const labelize = (value) => value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
const display = (value) => value == null || value === '' ? '—' : typeof value === 'object' ? JSON.stringify(value) : String(value);

export default function ReportesPage() {
  const { session } = useAuth();
  const [kind, setKind] = useState('sales');
  const [desde, setDesde] = useState(monthStart);
  const [hasta, setHasta] = useState(today);
  const [report, setReport] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function load(event) {
    event?.preventDefault(); setBusy(true); setError('');
    try { setReport(await getReport(session.token, kind, { desde, hasta })); }
    catch (cause) { setError(cause.message); setReport(null); }
    finally { setBusy(false); }
  }

  useEffect(() => { load(); }, [session.token]);
  const arrays = report ? Object.entries(report).filter(([, value]) => Array.isArray(value)) : [];
  const metrics = report ? Object.entries(report).filter(([key, value]) => key !== 'filtros' && key !== 'pagination' && !Array.isArray(value) && (typeof value !== 'object' || value === null)) : [];
  const summary = report?.resumen && !Array.isArray(report.resumen) && typeof report.resumen === 'object' ? Object.entries(report.resumen) : [];

  return <>
    <div className="page-heading"><div><span className="eyebrow">ANÁLISIS COMERCIAL</span><h1>Reportes</h1><p>Consulta resultados de ventas, clientes, campañas e interacciones.</p></div></div>
    <form className="report-filters form-card" onSubmit={load}>
      <label className="field">Reporte<select value={kind} onChange={(event) => setKind(event.target.value)}>{REPORTS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label className="field">Desde<input type="date" value={desde} onChange={(event) => setDesde(event.target.value)} /></label>
      <label className="field">Hasta<input type="date" value={hasta} onChange={(event) => setHasta(event.target.value)} /></label>
      <button className="button primary" disabled={busy}>{busy ? 'Consultando…' : 'Consultar'}</button>
    </form>
    {error && <div className="notice error" role="alert">{error}</div>}
    {busy && <div className="client-empty">Cargando reporte…</div>}
    {report && !busy && <>
      {(summary.length || metrics.length) > 0 && <div className="report-metrics">{[...summary, ...metrics].map(([key, value]) => <article className="report-metric" key={key}><span>{labelize(key)}</span><strong>{display(value)}</strong></article>)}</div>}
      {arrays.map(([section, rows]) => {
        const columns = [...new Set(rows.flatMap((row) => Object.keys(row || {})))];
        return <div key={section}><div className="section-title"><div><h2>{labelize(section)}</h2><p>{rows.length} registro(s)</p></div></div><section className="client-list-card"><div className="client-table-wrap"><table className="client-table"><thead><tr>{columns.map((column) => <th key={column}>{labelize(column)}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={row.id_cliente || row.id_venta || row.id_vendedor || index}>{columns.map((column) => <td key={column}>{display(row[column])}</td>)}</tr>)}{rows.length === 0 && <tr><td colSpan={Math.max(columns.length, 1)} className="client-empty">Sin registros en el periodo seleccionado.</td></tr>}</tbody></table></div></section></div>;
      })}
      {!arrays.length && !summary.length && !metrics.length && <div className="notice info">El reporte no contiene registros para mostrar.</div>}
    </>}
  </>;
}
