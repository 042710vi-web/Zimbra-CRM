import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../hooks/useAuth.js';
import { useApiAction } from '../../hooks/useApiAction.js';
import { useProducts } from '../../hooks/useProducts.js';
import { createSale } from '../../services/ventas.service.js';
import Field from '../../components/common/Field.jsx';
import Notice from '../../components/common/Notice.jsx';
import { formatCurrency } from '../../utils/formatters.js';

// HU: pendiente de documentar al recibir las historias de usuario.
// Endpoint asociado: pendiente de confirmar con su historia de usuario.
export default function VentasPage({ suggestedClientId }) {
  const { session } = useAuth();
  const { products } = useProducts();
  const commercialProducts = useMemo(() => products.filter((product) => product.tipo_licencia !== 'Prueba 60 dias'), [products]);
  const { busy, notice, run } = useApiAction();
  const vendorId = session.user.vendorId;
  const isAdmin = session.user.role === 'Administrador';
  const [form, setForm] = useState({ id_cliente: '', id_vendedor: '', metodo_pago: 'Transferencia', id_producto: '', cantidad: 1 });

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
    if (result) setForm((current) => ({ ...current, id_cliente: '', id_producto: '', cantidad: 1 }));
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
  </>;
}
