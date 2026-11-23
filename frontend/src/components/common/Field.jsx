export default function Field({ label, children, ...props }) {
  const fieldLabel = typeof label === 'string' ? label.replace(/\S/u, (letter) => letter.toLocaleUpperCase('es-CO')) : label;
  return <label className="field">{fieldLabel}{children || <input {...props} />}</label>;
}
