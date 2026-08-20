const VARIANTS = {
  default: 'border-slate-200 text-slate-500 bg-white hover:bg-slate-50 hover:text-blue-600 hover:border-blue-200',
  primary: 'border-blue-200 text-blue-600 bg-blue-50 hover:bg-blue-100',
  danger: 'border-red-200 text-danger bg-red-50 hover:bg-red-100',
  active: 'border-blue-300 text-blue-700 bg-blue-100 hover:bg-blue-200',
};

export function IconButton({ icon: Icon, onClick, variant = 'default', title, size = 15, disabled = false }) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      type="button"
      disabled={disabled}
      className={`w-9 h-9 rounded-lg border flex items-center justify-center transition-colors duration-200 shrink-0 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white ${VARIANTS[variant]}`}
    >
      <Icon size={size} />
    </button>
  );
}
