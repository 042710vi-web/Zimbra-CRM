import SearchInput from '../../components/common/SearchInput.jsx';
import PagedTable, { TablePagination } from '../../components/common/PagedTable.jsx';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../hooks/useAuth.js';
import { useApiAction } from '../../hooks/useApiAction.js';
import { useProducts } from '../../hooks/useProducts.js';
import { changeSaleState, createSale, getSaleDetail, listSales, updateSale } from '../../services/ventas.service.js';
import Field from '../../components/common/Field.jsx';
import Notice from '../../components/common/Notice.jsx';
import { formatCurrency } from '../../utils/formatters.js';

// HU-26: registrar una venta con sus productos y cantidades.
// Endpoint: POST /api/sales (consumido por ventas.service.js).
export default function VentasPage({ suggestedClientId }) {
  const { session } = useAuth();
  const { products } = useProducts();
  const commercialProducts = useMemo(() => products.filter((product) => product.tipo_licencia === 'Comercial'), [products]);
  const { busy, notice, run } = useApiAction();
  const vendorId = session.user.vendorId;
  const isAdmin = session.user.role === 'Administrador';
  const [form, setForm] = useState({ id_cliente: '', id_vendedor: '', metodo_pago: '', items: [{ id_producto: '', cantidad: 1 }] });
  const [sales, setSales] = useState([]);
  const [tablePage, setTablePage] = useState(1);
  const [tableSize, setTableSize] = useState(10);
  const [tableMeta, setTableMeta] = useState({ total: 0, pages: 1 });
  const [salesError, setSalesError] = useState('');
  const [salesBusy, setSalesBusy] = useState(true);
  const [clientSearch, setClientSearch] = useState('');
  const [filters, setFilters] = useState({ id_cliente: '', estado_venta: '' });
  const [appliedFilters, setAppliedFilters] = useState({});

  async function refreshSales(nextPage = tablePage) {
    setSalesBusy(true);
    setSalesError('');
    try {
      const result = await listSales(session.token, { page: nextPage, limit: tableSize, ...appliedFilters });
      setSales(result.data);
      setFilters((current) => ({ ...current, estado_venta: '' }));
      setTablePage(nextPage);
      setTableMeta(result.pagination || result);
    } catch (error) {
      setSalesError(error.message);
    } finally { setSalesBusy(false); }
  }

  useEffect(() => { refreshSales(1); }, [session.token, tableSize, appliedFilters]);

  function searchSales(event) { event.preventDefault(); setAppliedFilters({ ...filters }); setClientSearch(''); }

  useEffect(() => {
    if (suggestedClientId && !form.id_cliente) setForm((current) => ({ ...current, id_cliente: String(suggestedClientId) }));
  }, [suggestedClientId, form.id_cliente]);

  async function submit(event) {
    event.preventDefault();
    const data = {
      id_cliente: Number(form.id_cliente),
      id_vendedor: Number(vendorId || form.id_vendedor),
      metodo_pago: form.metodo_pago,
      items: form.items.map((item) => ({ id_producto: Number(item.id_producto), cantidad: Number(item.cantidad) })),
    };
    const result = await run(() => createSale(session.token, data));
    if (result) {
      setForm((current) => ({ ...current, id_cliente: '', metodo_pago: '', items: [{ id_producto: '', cantidad: 1 }] }));
      await refreshSales();
    }
  }
  async function editPending(sale) {
    const metodo_pago = window.prompt('Método de pago', sale.metodo_pago || 'Transferencia');
    if (metodo_pago === null) return;
    const currentItems = (sale.detalles || []).map((line) => `${line.id_producto}:${line.cantidad}`).join(', ');
    const input = window.prompt('Detalle: id_producto:cantidad separados por coma', currentItems);
    if (input === null) return;
    const items = input.split(',').map((part) => { const [product, quantity] = part.trim().split(':').map(Number); return { id_producto: product, cantidad: quantity }; });
    const result = await run(() => updateSale(session.token, { id_venta: sale.id_venta, metodo_pago, items }));
    if (result) await refreshSales();
  }
  async function showDetail(sale) {
    try { const detail = await getSaleDetail(session.token, sale.id_venta); window.alert(`Venta #${detail.id_venta}\n${(detail.detalles || []).map((line) => `${line.nombre_producto} × ${line.cantidad}: ${formatCurrency(line.subtotal)}`).join('\n')}`); }
    catch (cause) { setSalesError(cause.message); }
  }
  async function closeSale(sale, estado_venta) {
    const result = await run(() => changeSaleState(session.token, { id_venta: sale.id_venta, estado_venta }));
    if (result) await refreshSales();
  }

  return <div className="sales-page"><div className="page-heading"><div><span className="eyebrow">CIERRE COMERCIAL</span><h1>Registrar venta</h1><p>Registra la venta y congela el precio actual de cada producto.</p></div></div><Notice notice={notice} />
    <form className="form-card" onSubmit={submit}>
      <div className="form-section"><h3>Datos de la venta</h3><div className="form-grid">
        <Field label="ID del cliente *" type="number" min="1" required value={form.id_cliente} onChange={(event) => setForm({ ...form, id_cliente: event.target.value })} placeholder="Ej. 24" />
        {isAdmin ? <Field label="ID del vendedor *" type="number" min="1" required value={form.id_vendedor} onChange={(event) => setForm({ ...form, id_vendedor: event.target.value })} placeholder="Ej. 3" /> : <div className="field"><span>Vendedor asignado</span><div className="readonly-field">{vendorId ? `Vendedor #${vendorId}` : 'Tu usuario no tiene vendedor asociado'}</div></div>}
        <Field label="Método de pago"><select required value={form.metodo_pago} onChange={(event) => setForm({ ...form, metodo_pago: event.target.value })}><option value="">Selecciona un método</option><option>Transferencia</option><option>PSE</option><option>Tarjeta</option><option>Consignación</option><option>Otro</option></select></Field>
      </div></div>
      <div className="form-section"><h3>Productos</h3>{form.items.map((item, index) => <div className="form-grid sale-product-row" key={index}>
        <Field label={`Producto comercial ${index + 1} *`}><select required value={item.id_producto} onChange={(event) => setForm({ ...form, items: form.items.map((line, i) => i === index ? { ...line, id_producto: event.target.value } : line) })}><option value="">Selecciona un producto</option>{commercialProducts.map((product) => <option key={product.id_producto} value={product.id_producto}>{product.nombre_producto} · {formatCurrency(product.precio)}</option>)}</select></Field>
        <Field label="Cantidad *" type="number" min="1" required value={item.cantidad} onChange={(event) => setForm({ ...form, items: form.items.map((line, i) => i === index ? { ...line, cantidad: event.target.value } : line) })} />
        <div className="sale-product-actions">{form.items.length > 1 && <button type="button" className="button" onClick={() => setForm({ ...form, items: form.items.filter((_, i) => i !== index) })}>Quitar</button>}{index === form.items.length - 1 && <button type="button" className="button" onClick={() => setForm({ ...form, items: [...form.items, { id_producto: '', cantidad: 1 }] })}>Añadir producto</button>}</div>
      </div>)}</div>
      <div className="form-actions"><span className="muted">La venta, su detalle y auditoría se guardan en una transacción.</span><button className="button primary" disabled={busy || !commercialProducts.length || (!isAdmin && !vendorId)}>{busy ? 'Registrando…' : 'Registrar venta'} <span>→</span></button></div>
    </form>
    <div className="section-title clients-list-heading"><div><h2>Ventas registradas</h2><p>Historial comercial con su detalle de productos.</p></div><span className="count-chip">{tableMeta.total || 0} registros</span></div>
    <form className="form-card report-filters" onSubmit={searchSales}><Field label="Buscar cliente"><SearchInput label="Buscar cliente en ventas" path="/clients" value={clientSearch} onChange={value => { setClientSearch(value); setFilters(current => ({ ...current, id_cliente: /^\d+$/.test(value) ? value : '' })); }} onSelect={row => { const next = { ...filters, id_cliente: String(row.id_cliente) }; setFilters(next); setAppliedFilters(next); }} placeholder="Nombre, correo o ID" /></Field><Field label="Estado"><select value={filters.estado_venta} onChange={(e) => setFilters({ ...filters, estado_venta: e.target.value })}><option value="">Todos</option><option>Pendiente</option><option>Completada</option><option>Cancelada</option></select></Field><button className="button primary">Buscar</button></form>
    {salesError && <div className="notice error" role="alert">{salesError}</div>}
    <section className="client-list-card"><div className="client-table-wrap"><PagedTable managed className="client-table sales-table"><colgroup><col style={{ width: '7%' }} /><col style={{ width: '13%' }} /><col style={{ width: '12%' }} /><col style={{ width: '25%' }} /><col style={{ width: '12%' }} /><col style={{ width: '10%' }} /><col style={{ width: '21%' }} /></colgroup><thead><tr><th>Venta</th><th>Cliente</th><th>Vendedor</th><th>Productos</th><th>Total</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>
      {sales.map((sale) => <tr key={sale.id_venta}><td data-label="Venta"><strong>#{sale.id_venta}</strong><small>{sale.numero_contrato || sale.metodo_pago || 'Sin contrato'}</small></td><td data-label="Cliente">{sale.nombre_completo}</td><td data-label="Vendedor">{sale.nombre_vendedor}</td><td data-label="Productos">{(sale.detalles || []).map((line) => `${line.nombre_producto} × ${line.cantidad}`).join(', ') || '—'}</td><td data-label="Total">{formatCurrency(sale.total_venta)}</td><td data-label="Estado"><span className="client-status">{sale.estado_venta}</span></td><td className="sales-actions-cell" data-label="Acciones"><div className="sales-actions"><button className="button action-button" onClick={() => showDetail(sale)}>Detalle</button>{sale.estado_venta === 'Pendiente' && <><button className="button action-button" onClick={() => editPending(sale)}>Editar</button>{isAdmin && <><button className="button action-button" onClick={() => closeSale(sale, 'Completada')}>Completar</button><button className="button action-button" onClick={() => closeSale(sale, 'Cancelada')}>Cancelar</button></>}</>}</div></td></tr>)}
      {!salesBusy && sales.length === 0 && <tr><td colSpan="7" className="client-empty">No hay ventas para mostrar.</td></tr>}
      {salesBusy && <tr><td colSpan="7" className="client-empty">Cargando ventas…</td></tr>}
    </tbody></PagedTable></div><TablePagination page={tablePage} pages={tableMeta.pages || tableMeta.totalPages} total={tableMeta.total} size={tableSize} onSize={(value) => { setTablePage(1); setTableSize(value); }} onPage={refreshSales} disabled={salesBusy} /></section>
  </div>;
}
