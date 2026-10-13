import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

const tones = {
  neutral: 'bg-surface-2 text-muted border-border',
  accent: 'bg-accent/10 text-accent border-accent/20',
  success: 'bg-success/10 text-success border-success/25',
  danger: 'bg-danger/10 text-danger border-danger/25',
  warning: 'bg-warning/10 text-warning border-warning/25',
};

export function Badge({ tone = 'neutral', className, ...props }: HTMLAttributes<HTMLSpanElement> & { tone?: keyof typeof tones }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap',
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
