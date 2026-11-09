/**
 * Recibe las solicitudes de reportes, las entrega al servicio correspondiente y comunica el resultado.
 */
import * as reports from '../service/Reportes.service.js';

/** Convierte los resultados de un informe en filas aptas para un archivo CSV. */
function toCsv(report) {
  const rows = [];
  for (const [section, value] of Object.entries(report)) {
    if (section === 'filtros' || section === 'pagination') continue;
    if (Array.isArray(value)) {
      for (const row of value) rows.push({ seccion: section, ...row });
    } else if (value && typeof value === 'object') {
      rows.push({ seccion: section, ...value });
    } else if (value !== undefined) {
      rows.push({ seccion: 'resumen', metrica: section, valor: value });
    }
  }
  const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  /** Prepara cada valor para que las comas y comillas no alteren el archivo. */
  const escape = (value) => {
    const text = value == null ? '' : String(value);
    return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  };
  return `\uFEFF${[columns, ...rows.map((row) => columns.map((column) => row[column] ?? ''))]
    .map((row) => row.map(escape).join(','))
    .join('\r\n')}`;
}

/** Envía el informe como archivo CSV o como respuesta normal, según lo solicitado. */
function respond(req, res, report, filename) {
  if (String(req.query.format || '').toLowerCase() === 'csv') {
    res.type('text/csv; charset=utf-8');
    res.set('Content-Disposition', `attachment; filename="${filename}.csv"`);
    return res.send(toCsv(report));
  }
  return res.json(report);
}

/** Atiende la solicitud y comunica su resultado al usuario. */
export async function sales(req, res, next) {
  try { respond(req, res, await reports.salesReport(req.query, req.user), 'reporte-ventas'); } catch (error) { next(error); }
}
/** Atiende la solicitud y comunica su resultado al usuario. */
export async function clients(req, res, next) {
  try { respond(req, res, await reports.clientsReport(req.query, req.user), 'reporte-clientes'); } catch (error) { next(error); }
}
/** Atiende la solicitud y comunica su resultado al usuario. */
export async function campaigns(req, res, next) {
  try { respond(req, res, await reports.campaignsReport(req.query, req.user), 'reporte-campañas'); } catch (error) { next(error); }
}
/** Atiende la solicitud y comunica su resultado al usuario. */
export async function interactions(req, res, next) {
  try { respond(req, res, await reports.interactionsReport(req.query, req.user), 'reporte-interacciones'); } catch (error) { next(error); }
}