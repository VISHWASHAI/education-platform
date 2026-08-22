import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { CheckCircle2, XCircle, X } from 'lucide-react';
import { PrimaryButton } from '../components/shared/PrimaryButton';

const UIContext = createContext(null);

let toastId = 0;

export function UIProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [confirmState, setConfirmState] = useState(null);
  const resolverRef = useRef(null);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message, type = 'success') => {
      const id = ++toastId;
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => dismissToast(id), 4000);
    },
    [dismissToast]
  );

  const confirm = useCallback(({ title = 'Are you sure?', message, confirmLabel = 'Confirm', danger = false }) => {
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setConfirmState({ title, message, confirmLabel, danger });
    });
  }, []);

  function resolveConfirm(result) {
    resolverRef.current?.(result);
    resolverRef.current = null;
    setConfirmState(null);
  }

  return (
    <UIContext.Provider value={{ showToast, confirm }}>
      {children}

      <div className="fixed bottom-6 left-6 z-[60] flex flex-col gap-2 max-w-sm w-[calc(100vw-3rem)]">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex items-start gap-3 rounded-lg border px-4 py-3 shadow-lg bg-white ${
              t.type === 'success' ? 'border-success/40' : 'border-danger/40'
            }`}
          >
            {t.type === 'success' ? (
              <CheckCircle2 size={18} className="text-success shrink-0 mt-0.5" />
            ) : (
              <XCircle size={18} className="text-danger shrink-0 mt-0.5" />
            )}
            <p className="text-sm text-slate-700 flex-1">{t.message}</p>
            <button onClick={() => dismissToast(t.id)} className="text-slate-400 hover:text-slate-700 shrink-0">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>

      {confirmState && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 px-4">
          <div className="glass-card w-full max-w-sm p-6">
            <h3 className="text-lg font-semibold text-slate-900">{confirmState.title}</h3>
            {confirmState.message && <p className="text-sm text-slate-600 mt-2">{confirmState.message}</p>}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => resolveConfirm(false)}
                className="flex-1 btn-secondary !px-4 !py-2.5 text-sm"
              >
                Cancel
              </button>
              <PrimaryButton
                onClick={() => resolveConfirm(true)}
                className="flex-1 !px-4 !py-2.5 text-sm"
                style={confirmState.danger ? { background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)' } : undefined}
              >
                {confirmState.confirmLabel}
              </PrimaryButton>
            </div>
          </div>
        </div>
      )}
    </UIContext.Provider>
  );
}

export function useUI() {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error('useUI must be used within UIProvider');
  return ctx;
}
