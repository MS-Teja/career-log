import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const variants = {
  primary: 'bg-accent text-accent-fg hover:bg-accent/90 shadow-sm',
  secondary: 'bg-surface text-ink border border-border-strong/50 hover:bg-surface-2',
  ghost: 'text-muted hover:text-ink hover:bg-surface-2',
  danger: 'bg-danger text-danger-fg hover:bg-danger/90',
  'danger-ghost': 'text-danger hover:bg-danger/10',
};
const sizes = {
  sm: 'h-9 px-3 text-[13px] gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-11 px-5 text-[15px] gap-2',
  icon: 'h-10 w-10',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  loading?: boolean;
}

export const buttonClass = (variant: keyof typeof variants = 'primary', size: keyof typeof sizes = 'md', className?: string) =>
  cn(
    'inline-flex shrink-0 items-center justify-center rounded-lg font-medium transition-colors disabled:pointer-events-none disabled:opacity-50',
    variants[variant],
    sizes[size],
    className,
  );

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant, size, loading, className, children, disabled, type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={buttonClass(variant, size, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
});
