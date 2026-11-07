import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../hooks/useAuth.js';
import { useApiAction } from '../../hooks/useApiAction.js';
import { useProducts } from '../../hooks/useProducts.js';
import { createTrial } from '../../services/descargas.service.js';
import Field from '../../components/common/Field.jsx';
import Notice from '../../components/common/Notice.jsx';

// HU: pendiente de documentar al recibir las historias de usuario.
// Endpoint asociado: pendiente de confirmar con su historia de usuario.
export default function DescargasPage({ suggestedClientId }) {
  const { session } = useAuth();
  const { products } = useProducts();
  const trials = useMemo(() => products.filter((product) => product.tipo_licencia === 'Prueba 60 dias'), [products]);
  const { busy, notice, run } = useApiAction();
  const [form, setForm] = useState({ id_cliente: '', id_producto: '' });

  useEffect(() => {
    if (suggestedClientId && !form.id_cliente) setForm((current) => ({ ...current, id_cliente: String(suggestedClientId) }));
  }, [suggestedClientId, form.id_cliente]);

  async function submit(event) {
    event.preventDefault();
    const result = await run(() => createTrial(session.token, { id_cliente: Number(form.id_cliente), id_producto: Number(form.id_producto) }));
    if (result) setForm((current) => ({ ...current, id_producto: '' }));
  }

  return <><div className="page-heading"><div><span className="eyebrow">LICENCIAS DE EVALUACIÓN</span><h1>Iniciar prueba gratuita</h1><p>Activa una licencia de evaluación durante 60 días.</p></div></div><Notice notice={notice} /><form className="form-card narrow" onSubmit={submit}>
    <div className="trial-banner"><span className="quick-icon mint">◷</span><div><strong>Prueba de 60 días</strong><p>El CRM calcula la fecha de vencimiento y actualiza el puntaje del cliente.</p></div></div>
    <Field label="ID del cliente *" type="number" min="1" required value={form.id_cliente} onChange={(event) => setForm({ ...form, id_cliente: event.target.value })} placeholder="Ej. 24" />
    <Field label="Producto de prueba *"><select required value={form.id_producto} onChange={(event) => setForm({ ...form, id_producto: event.target.value })}><option value="">Selecciona una licencia</option>{trials.map((product) => <option key={product.id_producto} value={product.id_producto}>{product.nombre_producto}</option>)}</select></Field>
    <div className="form-actions"><span className="muted">El vencimiento se fija en 60 días.</span><button className="button primary" disabled={busy || !trials.length}>{busy ? 'Activando…' : 'Activar prueba'} <span>→</span></button></div>
  </form></>;
}
