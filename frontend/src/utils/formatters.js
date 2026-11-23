export function formatCurrency(value) {
  const amount = Number(value);
  return amount === 0 ? 'Gratis' : `$${amount.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

const dateOptions = { timeZone: 'America/Bogota', day: '2-digit', month: '2-digit', year: 'numeric' };

function parseDisplayDate(value) {
  if (value === null || value === undefined || value === '') return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value !== 'string') return null;
  let input = value.trim();
  const calendar = /^(\d{4})-(\d{2})-(\d{2})(?:$|[ T])/.exec(input);
  if (!calendar) return null;
  const [, year, month, day] = calendar;
  const check = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  if (check.getUTCFullYear() !== Number(year) || check.getUTCMonth() + 1 !== Number(month) || check.getUTCDate() !== Number(day)) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) input += 'T12:00:00-05:00';
  else {
    input = input.replace(' ', 'T');
    // MySQL DATETIME sin zona conserva la hora local del proyecto.
    if (!/(?:Z|[+-]\d{2}:?\d{2})$/i.test(input)) input += '-05:00';
  }
  const date = new Date(input);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDate(value) {
  const date = parseDisplayDate(value);
  return date ? new Intl.DateTimeFormat('en-GB', dateOptions).format(date) : '—';
}

export function formatDateTime(value) {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return formatDate(value);
  const date = parseDisplayDate(value);
  if (!date) return '—';
  const time = new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Bogota', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(date);
  return `${formatDate(date)} ${time}`;
}

export const localToday = () => {
  const parts = new Intl.DateTimeFormat('en-GB', dateOptions).formatToParts(new Date());
  const get = (type) => parts.find((part) => part.type === type).value;
  return `${get('year')}-${get('month')}-${get('day')}`;
};

export const isDateField = (key = '') => /(?:^|_)(?:fecha(?:_|$)|creado_en$|actualizado_en$|expira_en$|usado_en$|proximo_intento$|ultima_interaccion$|event_date$)/i.test(key);

export function formatMoney(value) {
  if (value === null || value === undefined || value === '') return '—';
  const amount = Number(value);
  return Number.isFinite(amount) ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount) : '—';
}

export const isMoneyField = (key = '') => /(?:^|_)(?:precio(?:_unitario)?|presupuesto|subtotal|total_venta|total_ventas_vendedor|total_facturado|total_revenue|total_ventas_completadas|total_ventas_completadas_historico|total_proyectado|total_detalle|total_final|total_ventas|ventas_totales|valor_proyectado|ticket_promedio(?:_ventas)?|monto|importe)(?:_|$)/i.test(key);

export function formatMoneyInText(value) {
  if (typeof value !== 'string') return value;
  return value.replace(/\$\s*(-?\d+(?:[.,]\d+)*)/g, (match, digits) => {
    const separators = [...digits.matchAll(/[.,]/g)];
    const last = separators.at(-1);
    const decimals = last && digits.length - last.index - 1 <= 2;
    const normalized = decimals ? digits.slice(0, last.index).replace(/[.,]/g, '') + '.' + digits.slice(last.index + 1) : digits.replace(/[.,]/g, '');
    return formatMoney(normalized);
  });
}

export function formatDisplayValue(value, key = '', row = {}) {
  if (value === null || value === undefined || value === '') return '—';
  const field = ['valor_anterior', 'valor_nuevo'].includes(key) ? row.campo : key;
  if (isDateField(field)) return formatDateTime(value);
  if (isMoneyField(field)) return formatMoney(value);
  if (typeof value === 'object') return JSON.stringify(value, (nestedKey, nestedValue) => nestedValue !== null && nestedValue !== '' && isDateField(nestedKey) ? formatDateTime(nestedValue) : nestedValue !== null && nestedValue !== '' && isMoneyField(nestedKey) ? formatMoney(nestedValue) : nestedValue);
  return typeof value === 'string' ? formatMoneyInText(value) : String(value);
}
