import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../hooks/useAuth.js';
import { useApiAction } from '../../hooks/useApiAction.js';
import { useProducts } from '../../hooks/useProducts.js';
import { createSale, listSales } from '../../services/ventas.service.js';
import Field from '../../components/common/Field.jsx';
import Notice from '../../components/common/Notice.jsx';
import { formatCurrency } from '../../utils/formatters.js';

// HU-28: registrar una venta con sus productos y cantidades.
// Endpoint: POST /api/sales (consumido por ventas.service.js).
export default function VentasPage({ suggestedClientId }) {
  const { session } = useAuth();
  const { products } = useProducts();
  const commercialProducts = useMemo(() => products.filter((product) => product.tipo_licencia !== 'Prueba 60 dias'), [products]);
  const { busy, notice, run } = useApiAction();
  const vendorId = session.user.vendorId;
  const isAdmin = session.user.role === 'Administrador';
  const [form, setForm] = useState({ id_cliente: '', id_vendedor: '', metodo_pago: 'Transferencia', id_producto: '', cantidad: 1 });
  const [sales, setSales] = useState([]);
  const [salesError, setSalesError] = useState('');
  const [salesBusy, setSalesBusy] = useState(true);

  async function refreshSales() {
    setSalesBusy(true);
    setSalesError('');
    try {
      const result = await listSales(session.token, { page: 1, limit: 50 });
      setSales(result.data);
    } catch (error) {
      setSalesError(error.message);
    } finally { setSalesBusy(false); }
  }

  useEffect(() => { refreshSales(); }, [session.token]);

  useEffect(() => {
    if (suggestedClientId && !form.id_cliente) setForm((current) => ({ ...current, id_cliente: String(suggestedClientId) }));
  }, [suggestedClientId, form.id_cliente]);

  async function submit(event) {
    event.preventDefault();
    const data = {
      id_cliente: Number(form.id_cliente),
      id_vendedor: Number(vendorId || form.id_vendedor),
      metodo_pago: form.metodo_pago,
      items: [{ id_producto: Number(form.id_producto), cantidad: Number(form.cantidad) }],
    };
    const result = await run(() => createSale(session.token, data));
    if (result) {
      setForm((current) => ({ ...current, id_cliente: '', id_producto: '', cantidad: 1 }));
      await refreshSales();
    }
  }

  return <><div className="page-heading"><div><span className="eyebrow">CIERRE COMERCIAL</span><h1>Registrar venta</h1><p>Registra la venta y congela el precio actual de cada producto.</p></div></div><Notice notice={notice} />
    <form className="form-card" onSubmit={submit}>
      <div className="form-section"><h3>Datos de la venta</h3><div className="form-grid">
        <Field label="ID del cliente *" type="number" min="1" required value={form.id_cliente} onChange={(event) => setForm({ ...form, id_cliente: event.target.value })} placeholder="Ej. 24" />
        {isAdmin ? <Field label="ID del vendedor *" type="number" min="1" required value={form.id_vendedor} onChange={(event) => setForm({ ...form, id_vendedor: event.target.value })} placeholder="Ej. 3" /> : <div className="field"><span>Vendedor asignado</span><div className="readonly-field">{vendorId ? `Vendedor #${vendorId}` : 'Tu usuario no tiene vendedor asociado'}</div></div>}
        <Field label="Método de pago"><select value={form.metodo_pago} onChange={(event) => setForm({ ...form, metodo_pago: event.target.value })}><option>Transferencia</option><option>PSE</option><option>Tarjeta</option><option>Consignación</option><option>Otro</option></select></Field>
      </div></div>
      <div className="form-section"><h3>Producto</h3><div className="form-grid">
        <Field label="Producto comercial o gratuito *"><select required value={form.id_producto} onChange={(event) => setForm({ ...form, id_producto: event.target.value })}><option value="">Selecciona un producto</option>{commercialProducts.map((product) => <option key={product.id_producto} value={product.id_producto}>{product.nombre_producto} · {formatCurrency(product.precio)}</option>)}</select></Field>
        <Field label="Cantidad *" type="number" min="1" required value={form.cantidad} onChange={(event) => setForm({ ...form, cantidad: event.target.value })} />
      </div></div>
      <div className="form-actions"><span className="muted">La venta, su detalle y auditoría se guardan en una transacción.</span><button className="button primary" disabled={busy || !commercialProducts.length || (!isAdmin && !vendorId)}>{busy ? 'Registrando…' : 'Registrar venta'} <span>→</span></button></div>
    </form>
    <div className="section-title clients-list-heading"><div><h2>Ventas registradas</h2><p>Historial comercial con su detalle de productos.</p></div><span className="count-chip">{sales.length} registros</span></div>
    {salesError && <div className="notice error" role="alert">{salesError}</div>}
    <section className="client-list-card"><div className="client-table-wrap"><table className="client-table"><thead><tr><th>Venta</th><th>Cliente</th><th>Vendedor</th><th>Productos</th><th>Total</th><th>Estado</th></tr></thead><tbody>
      {sales.map((sale) => <tr key={sale.id_venta}><td><strong>#{sale.id_venta}</strong><small>{sale.numero_contrato || sale.metodo_pago || 'Sin contrato'}</small></td><td>{sale.nombre_completo}</td><td>{sale.nombre_vendedor}</td><td>{(sale.detalles || []).map((line) => `${line.nombre_producto} × ${line.cantidad}`).join(', ') || '—'}</td><td>{formatCurrency(sale.total_venta)}</td><td><span className="client-status">{sale.estado_venta}</span></td></tr>)}
      {!salesBusy && sales.length === 0 && <tr><td colSpan="6" className="client-empty">No hay ventas para mostrar.</td></tr>}
      {salesBusy && <tr><td colSpan="6" className="client-empty">Cargando ventas…</td></tr>}
    </tbody></table></div></section>
  </>;
}
