import { useState } from 'react';
import { ActionDialog } from './ModuleUI.jsx';
export default function AlertAttention({ alert, onClose, onConfirm, busy, error }) {
  const [note, setNote] = useState('');
  return <ActionDialog title={`Atender alerta #${alert.id_alerta}`} onClose={onClose} onSubmit={() => onConfirm(note)} busy={busy} error={error} confirm="Marcar como atendida"><p><strong>{alert.tipo_alerta}</strong> · {alert.nombre_completo}</p><p>{alert.mensaje}</p><label className="field">Nota opcional<textarea maxLength={500} rows={4} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Describe la gestión realizada" /></label></ActionDialog>;
}
