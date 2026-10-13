import { forwardRef } from 'react';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { topicInfo } from '@/lib/topics';

interface Props {
  topic: string;
  /** Interactive toggle state; undefined = static chip. */
  active?: boolean;
  onClick?: () => void;
  href?: string;
  removable?: boolean;
  disabled?: boolean;
  size?: 'xs' | 'sm';
  className?: string;
}

export const TopicChip = forwardRef<HTMLButtonElement, Props>(function TopicChip(
  { topic, active, onClick, href, removable, disabled, size = 'sm', className },
  ref,
) {
  const t = topicInfo(topic);
  const interactive = !!(onClick || href);
  const classes = cn(
    'inline-flex items-center gap-1.5 rounded-full border font-medium transition-colors whitespace-nowrap',
    size === 'xs' ? 'px-2 py-px text-[11px]' : 'px-2.5 text-xs',
    // Interactive chips get a taller hit area for touch.
    size === 'sm' && (interactive ? 'min-h-8' : 'py-0.5'),
    active === false ? 'border-border-strong/40 bg-surface text-muted hover:text-ink hover:border-border-strong' : t.style.chip,
    interactive && 'cursor-pointer',
    disabled && 'cursor-not-allowed opacity-40 hover:text-muted',
    className,
  );
  const content = (
    <>
      <span className={cn('h-1.5 w-1.5 rounded-full', active === false ? 'bg-muted/60' : t.style.dot)} aria-hidden />
      {t.label}
      {removable && <X className="-mr-0.5 h-3 w-3" aria-hidden />}
    </>
  );
  if (href)
    return (
      <Link to={href} className={classes}>
        {content}
      </Link>
    );
  if (onClick)
    return (
      <button
        ref={ref}
        type="button"
        onClick={onClick}
        className={classes}
        disabled={disabled}
        aria-pressed={removable ? undefined : active}
        aria-label={removable ? `Remove ${t.label}` : undefined}
      >
        {content}
      </button>
    );
  return <span className={classes}>{content}</span>;
});
