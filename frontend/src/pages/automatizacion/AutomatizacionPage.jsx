import { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth.js';
import { createTemplate, listEmails, listTemplates, retryEmail, setTemplateState, updateTemplate } from '../../services/automation.service.js';

export default function AutomatizacionPage() {
  const { session } = useAuth();
  const [templates, setTemplates] = useState([]); const [emails, setEmails] = useState([]); const [error, setError] = useState('');
  const [form, setForm] = useState({ evento: '', nombre_plantilla: '', asunto: '', cuerpo: '' });
  async function load() { try { const [t, e] = await Promise.all([listTemplates(session.token), listEmails(session.token)]); setTemplates(t.data || []); setEmails(e.data || []); } catch (cause) { setError(cause.message); } }
  useEffect(() => { load(); }, [session.token]);
  async function submit(event) { event.preventDefault(); try { await createTemplate(session.token, form); setForm({ evento: '', nombre_plantilla: '', asunto: '', cuerpo: '' }); setError(''); await load(); } catch (cause) { setError(cause.message); } }
  async function toggle(row) { try { await setTemplateState(session.token, { id_plantilla: row.id_plantilla, estado: !row.estado }); await load(); } catch (cause) { setError(cause.message); } }
  async function edit(row) { const asunto = window.prompt('Asunto de plantilla', row.asunto); if (asunto === null) return; const cuerpo = window.prompt('Cuerpo de plantilla', row.cuerpo); if (cuerpo === null) return; try { await updateTemplate(session.token, { id_plantilla: row.id_plantilla, asunto, cuerpo }); await load(); } catch (cause) { setError(cause.message); } }
  async function retry(id) { try { await retryEmail(session.token, id); await load(); } catch (cause) { setError(cause.message); } }
  return <><div className="page-heading"><div><span className="eyebrow">HU-18 · HU-19</span><h1>Correos automatizados</h1><p>Plantillas por evento e historial de envíos con reintentos.</p></div></div>{error && <div className="notice error">{error}</div>}
    <form className="form-card" onSubmit={submit}><h2>Nueva plantilla</h2>{Object.keys(form).map((key) => <label className="field" key={key}>{key.replaceAll('_', ' ')}<input required value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} /></label>)}<button className="button primary">Crear plantilla</button></form>
    <div className="section-title"><div><h2>Plantillas</h2></div></div><section className="client-list-card"><div className="client-table-wrap"><table className="client-table"><thead><tr><th>Evento</th><th>Plantilla</th><th>Asunto / vista previa</th><th>Estado</th><th></th></tr></thead><tbody>{templates.map((x) => <tr key={x.id_plantilla}><td>{x.evento}</td><td>{x.nombre_plantilla}</td><td>{x.asunto}<details><summary>Ver cuerpo</summary><p>{x.cuerpo}</p></details></td><td>{x.estado ? 'Activa' : 'Inactiva'}</td><td><button className="button" onClick={() => edit(x)}>Editar</button> <button className="button" onClick={() => toggle(x)}>{x.estado ? 'Desactivar' : 'Activar'}</button></td></tr>)}</tbody></table></div></section>
    <div className="section-title"><div><h2>Historial de correos</h2></div></div><section className="client-list-card"><div className="client-table-wrap"><table className="client-table"><thead><tr><th>Cliente</th><th>Evento</th><th>Destino</th><th>Estado</th><th>Intentos</th><th></th></tr></thead><tbody>{emails.map((x) => <tr key={x.id_correo}><td>{x.nombre_completo}</td><td>{x.evento}</td><td>{x.correo_destino}</td><td>{x.estado_correo}</td><td>{x.intentos}</td><td>{x.estado_correo === 'Fallido' && Number(x.intentos) < 3 && <button className="button" onClick={() => retry(x.id_correo)}>Reintentar</button>}</td></tr>)}</tbody></table></div></section>
  </>;
}
