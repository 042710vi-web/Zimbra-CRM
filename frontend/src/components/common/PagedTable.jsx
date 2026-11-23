import { Children, cloneElement, isValidElement, useState } from 'react';

export const PAGE_SIZES = [10, 20, 30];
export const validPageSize = (value) => PAGE_SIZES.includes(Number(value)) ? Number(value) : 10;

function cellText(node) {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(cellText).join(' ');
  if (!isValidElement(node)) return '';
  if (node.props['data-sort-value'] != null) return String(node.props['data-sort-value']);
  if (node.props.value != null) return String(node.props.value);
  if (node.type === 'details' || node.type === 'small' || node.type === 'button') return '';
  return cellText(node.props.children);
}

function comparable(value) {
  const text = String(value ?? '').trim();
  if (!text || text === '—') return null;
  const date = text.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}))?$/);
  if (date) return Date.UTC(+date[3], +date[2] - 1, +date[1], +(date[4] || 0), +(date[5] || 0));
  if (/^\d{4}-\d{2}-\d{2}(?:T|$)/.test(text) && Number.isFinite(Date.parse(text))) return Date.parse(text);
  if (/^[#$]?\s*-?[\d.,]+(?:\s*(?:pts|día\(s\)))?$/.test(text)) {
    const clean = text.replace(/[^\d.,-]/g, '');
    const number = Number(clean.includes(',') ? clean.replaceAll('.', '').replace(',', '.') : /^-?\d{1,3}(?:\.\d{3})+$/.test(clean) ? clean.replaceAll('.', '') : clean);
    if (Number.isFinite(number)) return number;
  }
  if (text === 'Gratis') return 0;
  return text;
}

function compareCells(a, b) {
  const left = comparable(a), right = comparable(b);
  if (left === null || right === null) return left === right ? 0 : left === null ? 1 : -1;
  return typeof left === 'number' && typeof right === 'number' ? left - right : String(left).localeCompare(String(right), 'es', { numeric: true, sensitivity: 'base' });
}

export function TablePagination({ page, pages, total, size = 10, onPage, onSize, disabled = false }) {
  const lastPage = Math.max(1, Number(pages) || 1);
  return <div className="table-pagination">
    <label>Registros por página<select aria-label="Registros por página" value={validPageSize(size)} disabled={disabled} onChange={(event) => onSize(Number(event.target.value))}>{PAGE_SIZES.map((count) => <option key={count} value={count}>{count}</option>)}</select></label>
    <span role="status">{total ?? 0} registro(s) · Página {page} de {lastPage}</span>
    <div><button type="button" className="button" disabled={disabled || page <= 1} onClick={() => onPage(page - 1)}>Anterior</button><button type="button" className="button" disabled={disabled || page >= lastPage} onClick={() => onPage(page + 1)}>Siguiente</button></div>
  </div>;
}

// Las listas completas se paginan localmente; las consultas paginadas usan managed.
export default function PagedTable({ children, managed = false, ...props }) {
  const [size, setSize] = useState(10);
  const [position, setPosition] = useState({ page: 1, dataset: '' });
  const [sort, setSort] = useState(null);
  const sections = Children.toArray(children);
  const body = sections.find((child) => isValidElement(child) && child.type === 'tbody');
  const rows = Children.toArray(body?.props.children);
  const records = rows.filter((row) => isValidElement(row) && !Children.toArray(row.props.children).some((cell) => isValidElement(cell) && cell.props.colSpan));
  const ordered = sort ? records.map((row, index) => ({ row, index })).sort((a, b) => {
    const first = Children.toArray(a.row.props.children)[sort.column];
    const second = Children.toArray(b.row.props.children)[sort.column];
    return compareCells(cellText(first), cellText(second)) * sort.direction || a.index - b.index;
  }).map(({ row }) => row) : records;
  const dataset = `${records.length}:${records[0]?.key ?? ''}:${records.at(-1)?.key ?? ''}:${sort?.column}:${sort?.direction}`;
  const pages = Math.max(1, Math.ceil(records.length / size));
  const page = Math.min(pages, position.dataset === dataset ? position.page : 1);
  const visible = records.length ? managed ? ordered : ordered.slice((page - 1) * size, page * size) : rows;
  return <><table {...props}>{sections.map((section) => {
    if (section === body) return cloneElement(section, {}, visible);
    if (!isValidElement(section) || section.type !== 'thead') return section;
    return cloneElement(section, {}, Children.map(section.props.children, (headerRow) => !isValidElement(headerRow) ? headerRow : cloneElement(headerRow, {}, Children.map(headerRow.props.children, (header, column) => {
      if (!isValidElement(header) || header.type !== 'th') return header;
      const label = cellText(header.props.children).trim();
      if (!label || /^(Acciones|Acción)$/i.test(label) || header.props.colSpan > 1) return header;
      const active = sort?.column === column;
      return cloneElement(header, { 'aria-sort': active ? sort.direction === 1 ? 'ascending' : 'descending' : 'none' }, <button type="button" className="table-sort" title={`${active && sort.direction === 1 ? 'Ordenar descendente' : 'Ordenar ascendente'} por ${label}${managed ? ' (página actual)' : ''}`} onClick={() => setSort({ column, direction: active && sort.direction === 1 ? -1 : 1 })}>{header.props.children}<span aria-hidden="true">{active ? sort.direction === 1 ? '↑' : '↓' : '↕'}</span></button>);
    }))));
  })}</table>{!managed && <TablePagination page={page} pages={pages} total={records.length} size={size} onPage={(next) => setPosition({ page: next, dataset })} onSize={(next) => { setSize(validPageSize(next)); setPosition({ page: 1, dataset }); }} />}</>;
}
