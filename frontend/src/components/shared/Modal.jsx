import { X } from 'lucide-react';

export function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-8">
      <div className="glass-card w-full max-w-md p-6 max-h-full overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-slate-900">{title}</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-900 transition-colors duration-300 shrink-0 ml-4">
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
