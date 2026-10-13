import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function StatTile({ label, value, hint, className }: { label: string; value: ReactNode; hint?: ReactNode; className?: string }) {
  return (
    <div className={cn('rounded-lg border border-border bg-surface px-4 py-3.5', className)}>
      <div className="text-[13px] text-muted">{label}</div>
      <div className="mt-1 text-[26px] font-semibold leading-none tracking-tight tabular-nums">{value}</div>
      {hint && <div className="mt-1.5 text-xs text-muted">{hint}</div>}
    </div>
  );
}
