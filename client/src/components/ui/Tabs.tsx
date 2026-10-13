import { useRef, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** Accessible tabs: arrow keys move between tabs; pair with <TabPanel id={…} />. */
export function Tabs<T extends string>({
  id,
  value,
  onChange,
  items,
  className,
}: {
  id: string;
  value: T;
  onChange: (v: T) => void;
  items: { value: T; label: string; count?: number }[];
  className?: string;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKeyDown = (e: React.KeyboardEvent, index: number) => {
    const delta = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    const target = e.key === 'Home' ? 0 : e.key === 'End' ? items.length - 1 : delta ? (index + delta + items.length) % items.length : -1;
    if (target < 0) return;
    e.preventDefault();
    refs.current[target]?.focus();
    onChange(items[target]!.value);
  };

  return (
    <div role="tablist" className={cn('flex gap-1 overflow-x-auto border-b border-border', className)}>
      {items.map((item, i) => {
        const active = item.value === value;
        return (
          <button
            key={item.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            id={`${id}-tab-${item.value}`}
            role="tab"
            aria-selected={active}
            aria-controls={`${id}-panel`}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(item.value)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={cn(
              '-mb-px flex min-h-11 items-center gap-2 whitespace-nowrap border-b-2 px-3 text-sm font-medium transition-colors',
              active ? 'border-accent text-ink' : 'border-transparent text-muted hover:text-ink',
            )}
          >
            {item.label}
            {item.count !== undefined && (
              <span className={cn('meta rounded px-1.5 py-px', active ? 'bg-accent/10 text-accent' : 'bg-surface-2')}>{item.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function TabPanel({ id, value, children, className }: { id: string; value: string; children: ReactNode; className?: string }) {
  return (
    <div
      role="tabpanel"
      id={`${id}-panel`}
      aria-labelledby={`${id}-tab-${value}`}
      tabIndex={0}
      className={cn('focus:outline-none', className)}
    >
      {children}
    </div>
  );
}
