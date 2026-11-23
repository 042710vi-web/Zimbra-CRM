import { useEffect, useId, useState } from 'react';
import { useModuleQuery } from '../../hooks/useModuleQuery.js';
import { normalizeSearchValue } from '../../utils/search.js';

const normalize = (value) => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export default function SearchInput({ value, onChange, onSelect, path, params = {}, options, kind = 'client', label = 'Buscar', placeholder = 'Nombre', disabled = false }) {
  const text = normalizeSearchValue(value);
  const [debounced, setDebounced] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const id = useId();
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(text.trim()), 250);
    return () => clearTimeout(timer);
  }, [text]);
  const show = open && !!text.trim() && !disabled;
  const query = useModuleQuery(path, { ...params, q: debounced, page: 1, limit: 10 }, { enabled: show && !!debounced && !options });
  const rows = options ? options.filter(row => normalize(row.label).includes(normalize(text.trim()))).slice(0, 10) : Array.isArray(query.data) ? query.data.slice(0, 10) : query.data?.data || [];
  const pending = !options && (text.trim() !== debounced || query.loading || !debounced);
  function choose(row) {
    setOpen(false); setActive(-1); setDebounced(''); onChange(''); onSelect(row);
  }
  function keyDown(event) {
    if (event.key === 'Escape') { setOpen(false); setActive(-1); return; }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault(); setOpen(true);
      if (!pending && rows.length) setActive(current => event.key === 'ArrowDown' ? (current + 1) % rows.length : current <= 0 ? rows.length - 1 : current - 1);
    }
    if (event.key === 'Enter' && show && active >= 0 && !pending && rows[active]) { event.preventDefault(); choose(rows[active]); }
  }
  return <div className="search-suggestions" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
    <input type="search" role="combobox" aria-label={label} aria-autocomplete="list" aria-expanded={show} aria-controls={id} aria-activedescendant={show && !pending && active >= 0 && rows[active] ? `${id}-${active}` : undefined} autoComplete="off" disabled={disabled} value={text} placeholder={placeholder} onFocus={() => setOpen(true)} onKeyDown={keyDown} onChange={event => { onChange(normalizeSearchValue(event.target.value)); setOpen(true); setActive(-1); }} />
    {show && <div className="lookup-results"><div id={id} role="listbox" aria-label={`Sugerencias: ${label}`}>
      {!pending && !query.error && rows.map((row, index) => {
        const name = row.label ?? row.nombre_completo ?? row.nombre_empresa ?? row.nombre_producto ?? row.nombre_accion;
        const detail = kind === 'client' ? [row.correo_electronico, row.nombre_empresa].filter(Boolean).join(' · ') : kind === 'company' ? [row.sector_industria, row.sitio_web].filter(Boolean).join(' · ') : kind === 'product' ? row.tipo_licencia : kind === 'action' ? `${row.puntaje} puntos` : '';
        const rowId = row.id_cliente ?? row.id_empresa ?? row.id_producto ?? row.id_accion;
        const status = row.estado_cliente ?? (row.estado == null ? '' : Number(row.estado) ? 'Activo' : 'Inactivo');
        return <button type="button" role="option" id={`${id}-${index}`} key={rowId ?? row.value ?? index} aria-selected={active === index} onMouseDown={event => event.preventDefault()} onClick={() => choose(row)}><strong>{name}</strong>{detail && <small>{detail}</small>}{(status || rowId != null) && <small>{[status, rowId != null ? `#${rowId}` : ''].filter(Boolean).join(' · ')}</small>}</button>;
      })}
    </div>{pending ? <p role="status">Buscando…</p> : query.error ? <p role="alert">{query.error}</p> : !rows.length && <p role="status">No se encontraron resultados.</p>}</div>}
  </div>;
}
