import type { ReactNode } from 'react';
import { Notebook } from 'lucide-react';
import { cn } from '@/lib/utils';

export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center rounded-lg border border-dashed border-border px-6 py-14 text-center', className)}>
      <Notebook className="h-8 w-8 text-muted/60" aria-hidden />
      <h3 className="mt-3 font-serif text-lg font-medium">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
