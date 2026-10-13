import {
  createContext,
  forwardRef,
  useContext,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const fieldBase =
  'w-full rounded-lg border border-border-strong/60 bg-surface px-3 text-sm text-ink placeholder:text-muted transition-colors hover:border-border-strong focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25 disabled:opacity-60 aria-[invalid=true]:border-danger';

/** Lets inputs inside a <Field> pick up aria-describedby / aria-invalid automatically. */
const FieldContext = createContext<{ describedBy?: string; invalid?: boolean }>({});

function useFieldAria(props: { 'aria-describedby'?: string; 'aria-invalid'?: React.AriaAttributes['aria-invalid'] }) {
  const ctx = useContext(FieldContext);
  return {
    'aria-describedby': props['aria-describedby'] ?? ctx.describedBy,
    'aria-invalid': props['aria-invalid'] ?? (ctx.invalid || undefined),
  };
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...props }, ref) {
  const aria = useFieldAria(props);
  return <input ref={ref} className={cn(fieldBase, 'h-10', className)} {...props} {...aria} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea(
  { className, ...props },
  ref,
) {
  const aria = useFieldAria(props);
  return <textarea ref={ref} className={cn(fieldBase, 'min-h-[88px] py-2 leading-relaxed', className)} {...props} {...aria} />;
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select(
  { className, children, ...props },
  ref,
) {
  const aria = useFieldAria(props);
  return (
    <div className="relative">
      <select ref={ref} className={cn(fieldBase, 'h-10 cursor-pointer appearance-none pr-9', className)} {...props} {...aria}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
    </div>
  );
});

export function Field({
  label,
  hint,
  error,
  children,
  className,
}: {
  label: string;
  hint?: ReactNode;
  error?: string;
  children: (id: string) => ReactNode;
  className?: string;
}) {
  const id = useId();
  const msgId = `${id}-msg`;
  const message = error ?? hint;
  return (
    <FieldContext.Provider value={{ describedBy: message ? msgId : undefined, invalid: !!error }}>
      <div className={cn('space-y-1.5', className)}>
        <label htmlFor={id} className="block text-[13px] font-medium text-ink">
          {label}
        </label>
        {children(id)}
        {error ? (
          <p id={msgId} className="text-[13px] text-danger" role="alert">
            {error}
          </p>
        ) : (
          hint && (
            <p id={msgId} className="text-[13px] text-muted">
              {hint}
            </p>
          )
        )}
      </div>
    </FieldContext.Provider>
  );
}
