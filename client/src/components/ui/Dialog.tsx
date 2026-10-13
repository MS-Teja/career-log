import { useEffect, useId, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const pressedOnBackdrop = useRef(false);
  const id = useId();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-labelledby={`${id}-title`}
      aria-describedby={description ? `${id}-desc` : undefined}
      // Only close when both press and release happen on the backdrop, so a text
      // selection that ends outside the box doesn't throw away what was typed.
      onMouseDown={(e) => (pressedOnBackdrop.current = e.target === ref.current)}
      onClick={(e) => {
        if (pressedOnBackdrop.current && e.target === ref.current) onClose();
        pressedOnBackdrop.current = false;
      }}
      className={cn(
        'w-[calc(100%-2rem)] max-w-md rounded-xl border border-border bg-surface p-0 text-ink shadow-xl backdrop:bg-black/40 backdrop:backdrop-blur-[2px]',
        className,
      )}
    >
      {open && (
        <div className="animate-fade-in p-5">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h2 id={`${id}-title`} className="text-lg font-semibold">
                {title}
              </h2>
              {description && (
                <p id={`${id}-desc`} className="mt-1 text-sm text-muted">
                  {description}
                </p>
              )}
            </div>
            <button onClick={onClose} className="-m-1 rounded-md p-2 text-muted hover:bg-surface-2 hover:text-ink" aria-label="Close">
              <X className="h-4 w-4" />
            </button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}

/** Small yes/no confirmation built on Dialog (replaces window.confirm). */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  danger,
  loading,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Dialog open={open} onClose={onClose} title={title} description={description}>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="h-10 rounded-lg border border-border-strong/50 px-4 text-sm font-medium hover:bg-surface-2"
        >
          Cancel
        </button>
        <button
          type="button"
          autoFocus
          disabled={loading}
          onClick={onConfirm}
          className={cn(
            'h-10 rounded-lg px-4 text-sm font-medium disabled:opacity-50',
            danger ? 'bg-danger text-danger-fg hover:bg-danger/90' : 'bg-accent text-accent-fg hover:bg-accent/90',
          )}
        >
          {confirmLabel}
        </button>
      </div>
    </Dialog>
  );
}
