export default function Field({ label, children, ...props }) {
  return <label className="field">{label}{children || <input {...props} />}</label>;
}
