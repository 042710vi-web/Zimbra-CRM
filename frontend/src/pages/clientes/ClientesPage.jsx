import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth.js';
import { useApiAction } from '../../hooks/useApiAction.js';
import { createClient } from '../../services/clientes.service.js';
import Field from '../../components/common/Field.jsx';
import Notice from '../../components/common/Notice.jsx';

// HU-05: registrar nuevos clientes.
// Endpoint: POST /api/clients (consumido por clientes.service.js).
export default function ClientesPage({ onCreated }) {
  const { session } = useAuth();
  const { busy, notice, run } = useApiAction();
  const [form, setForm] = useState({ nombre_completo: '', correo_electronico: '', telefono: '', nombre_empresa: '', sector_industria: '', sitio_web: '' });
  const [createdCount, setCreatedCount] = useState(0);

  function set(key, value) { setForm((current) => ({ ...current, [key]: value })); }
  async function submit(event) {
    event.preventDefault();
    const result = await run(() => createClient(session.token, form));
    if (!result) return;
    setCreatedCount((count) => count + 1);
    onCreated?.(result.id_cliente);
    setForm({ nombre_completo: '', correo_electronico: '', telefono: '', nombre_empresa: '', sector_industria: '', sitio_web: '' });
  }

  return <><div className="page-heading"><div><span className="eyebrow">PROSPECTOS</span><h1>Registrar cliente</h1><p>Añade una persona interesada al CRM.</p></div></div><Notice notice={notice} /><form className="form-card" onSubmit={submit}>
    <div className="form-section"><h3>Información de contacto</h3><p>Los campos con * son obligatorios.</p><div className="form-grid"><Field label="Nombre completo *" required value={form.nombre_completo} onChange={(event) => set('nombre_completo', event.target.value)} placeholder="Nombre y apellido" /><Field label="Correo electrónico *" type="email" required value={form.correo_electronico} onChange={(event) => set('correo_electronico', event.target.value)} placeholder="persona@empresa.com" /><Field label="Teléfono" value={form.telefono} onChange={(event) => set('telefono', event.target.value)} placeholder="+57 300 000 0000" /></div></div>
    <div className="form-section"><h3>Empresa <span className="optional">Opcional</span></h3><div className="form-grid"><Field label="Nombre de empresa" value={form.nombre_empresa} onChange={(event) => set('nombre_empresa', event.target.value)} placeholder="Empresa" /><Field label="Sector" value={form.sector_industria} onChange={(event) => set('sector_industria', event.target.value)} placeholder="Tecnología" /><Field label="Sitio web" type="url" value={form.sitio_web} onChange={(event) => set('sitio_web', event.target.value)} placeholder="https://empresa.com" /></div></div>
    <div className="form-actions"><span className="muted">{createdCount ? `${createdCount} cliente(s) creado(s) en esta sesión` : 'El registro queda disponible para pruebas y ventas.'}</span><button className="button primary" disabled={busy}>{busy ? 'Guardando…' : 'Guardar cliente'} <span>→</span></button></div>
  </form></>;
}
