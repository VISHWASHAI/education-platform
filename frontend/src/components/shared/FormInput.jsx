export function FormInput({ label, className = '', ...props }) {
  return (
    <label className="block">
      {label && <span className="label-caps mb-2 block">{label}</span>}
      <input className={`input-field ${className}`} {...props} />
    </label>
  );
}
