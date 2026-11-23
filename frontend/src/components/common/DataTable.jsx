import PagedTable from './PagedTable.jsx';
import { formatDisplayValue } from '../../utils/formatters.js';
export default function DataTable({ rows = [], actions, managed = false }) {
  const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  return <div className="client-table-wrap"><PagedTable managed={managed} className="client-table"><thead><tr>{columns.map((column) => <th key={column} data-column={column}>{column.replaceAll('_', ' ').replace(/^./, (letter) => letter.toUpperCase())}</th>)}{actions && <th>Acciones</th>}</tr></thead><tbody>{rows.map((row, index) => <tr key={index}>{columns.map((column) => <td key={column} data-sort-value={typeof row[column] === 'object' ? undefined : row[column]} data-label={column.replaceAll('_', ' ').replace(/^./, (letter) => letter.toUpperCase())}>{formatDisplayValue(row[column], column, row)}</td>)}{actions && <td data-label="Acciones">{actions(row)}</td>}</tr>)}{!rows.length && <tr><td colSpan={columns.length + (actions ? 1 : 0) || 1}>Sin registros.</td></tr>}</tbody></PagedTable></div>;
}
