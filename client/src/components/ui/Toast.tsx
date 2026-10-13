import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';

type Tone = 'success' | 'error';
interface ToastOptions {
  action?: { label: string; onClick: () => void };
  duration?: number;
}
interface ToastItem extends ToastOptions {
  id: number;
  message: string;
  tone: Tone;
}

type Push = (message: string, tone?: Tone, options?: ToastOptions) => void;
const ToastContext = createContext<Push>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const push = useCallback<Push>((message, tone = 'success', options = {}) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-2), { id, message, tone, ...options }]);
  }, []);

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4" aria-live="polite">
        {toasts.map((t) => (
          <Toast key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function Toast({ toast, onDismiss }: { toast: ToastItem; onDismiss: () => void }) {
  const [paused, setPaused] = useState(false);
  const remaining = useRef(toast.duration ?? (toast.action ? 6000 : 4000));
  const started = useRef(Date.now());

  // Auto-dismiss, pausing while hovered or focused.
  useEffect(() => {
    if (paused) return;
    started.current = Date.now();
    const t = setTimeout(onDismiss, remaining.current);
    return () => {
      clearTimeout(t);
      remaining.current -= Date.now() - started.current;
    };
  }, [paused, onDismiss]);

  return (
    <div
      role={toast.tone === 'error' ? 'alert' : 'status'}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className="pointer-events-auto flex w-full max-w-sm animate-fade-in items-center gap-2 rounded-lg border border-border bg-surface py-2 pl-4 pr-2 text-sm shadow-lg"
    >
      {toast.tone === 'success' ? (
        <CheckCircle2 className="h-4 w-4 shrink-0 text-success" aria-hidden />
      ) : (
        <AlertCircle className="h-4 w-4 shrink-0 text-danger" aria-hidden />
      )}
      <span className="flex-1">{toast.message}</span>
      {toast.action && (
        <button
          onClick={() => {
            toast.action!.onClick();
            onDismiss();
          }}
          className="rounded-md px-2 py-1.5 font-medium text-accent hover:bg-accent/10"
        >
          {toast.action.label}
        </button>
      )}
      <button onClick={onDismiss} className="rounded-md p-1.5 text-muted hover:bg-surface-2 hover:text-ink" aria-label="Dismiss">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export const useToast = () => useContext(ToastContext);
