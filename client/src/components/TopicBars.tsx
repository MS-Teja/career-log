import { Link } from 'react-router-dom';
import type { TopicStat } from '@career-log/shared';
import { cn, pct } from '@/lib/utils';
import { topicInfo } from '@/lib/topics';

/**
 * Horizontal bars: share of technical rounds in which each topic was asked.
 * Rendered as HTML so labels stay crisp, wrap on mobile and each row links to filtered results.
 */
export function TopicBars({
  topics,
  linkFor,
  max = 12,
  totalRounds,
  className,
}: {
  topics: TopicStat[];
  linkFor?: (topic: string) => string;
  max?: number;
  /** When given, shows "6 of 8 rounds" so the sample size behind each percentage is visible. */
  totalRounds?: number;
  className?: string;
}) {
  const rows = topics.slice(0, max);
  const top = Math.max(...rows.map((t) => t.share), 0.0001);
  return (
    <ul className={cn('space-y-1', className)}>
      {rows.map((t) => {
        const info = topicInfo(t.topic);
        const inner = (
          <>
            <div className="flex items-baseline justify-between gap-3 text-[13px]">
              <span className="truncate font-medium text-ink">{info.label}</span>
              <span className="meta shrink-0">
                <span className="text-ink">{pct(t.share)}</span> · {t.rounds}
                {totalRounds ? ` of ${totalRounds}` : ''} rnd{(totalRounds ?? t.rounds) === 1 ? '' : 's'}
              </span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-surface-2">
              <div
                className={cn('h-full rounded-full transition-[width] duration-500', info.style.dot)}
                style={{ width: `${(t.share / top) * 100}%` }}
              />
            </div>
          </>
        );
        return (
          <li key={t.topic}>
            {linkFor ? (
              <Link to={linkFor(t.topic)} className="block rounded-md px-2 py-1.5 hover:bg-surface-2">
                {inner}
              </Link>
            ) : (
              <div className="px-2 py-1.5">{inner}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
