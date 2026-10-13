import { forwardRef, useId, useMemo, useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { TOPIC_CATEGORIES, TOPIC_CATEGORY_LABELS, TOPICS, type RoundType, type TopicId } from '@career-log/shared';
import { suggestTopics } from '@/lib/suggestTopics';
import { cn } from '@/lib/utils';
import { TopicChip } from './TopicChip';

/**
 * Selected topics first, then a few suggestions from the summary text and round type,
 * then search, with the full list one click away. Keeps 30 chips off the screen per question.
 */
export const TopicPicker = forwardRef<
  HTMLButtonElement,
  {
    value: TopicId[];
    onChange: (v: TopicId[]) => void;
    summary?: string;
    roundType?: RoundType;
    max?: number;
    invalid?: boolean;
    describedBy?: string;
  }
>(function TopicPicker({ value, onChange, summary = '', roundType, max = 6, invalid, describedBy }, ref) {
  const [query, setQuery] = useState('');
  const [browse, setBrowse] = useState(false);
  const id = useId();
  const full = value.length >= max;

  const toggle = (t: TopicId) => {
    if (value.includes(t)) onChange(value.filter((x) => x !== t));
    else if (!full) onChange([...value, t]);
  };

  const suggestions = useMemo(() => suggestTopics(summary, roundType, value), [summary, roundType, value]);
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return TOPICS.filter((t) => !value.includes(t.id) && (t.label.toLowerCase().includes(q) || t.id.includes(q))).slice(0, 8);
  }, [query, value]);

  return (
    <div role="group" aria-labelledby={`${id}-label`} aria-describedby={describedBy} className="space-y-2.5">
      <div className="flex items-baseline justify-between gap-2">
        <span id={`${id}-label`} className="text-[13px] font-medium">
          Topics
        </span>
        <span className={cn('meta', full && 'text-warning', invalid && value.length === 0 && 'text-danger')}>
          {value.length}/{max}
        </span>
      </div>

      {value.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {value.map((t, i) => (
            <TopicChip key={t} ref={i === 0 ? ref : undefined} topic={t} removable onClick={() => toggle(t)} />
          ))}
        </div>
      ) : (
        <p className={cn('text-[13px]', invalid ? 'text-danger' : 'text-muted')}>Pick at least one topic.</p>
      )}

      {suggestions.length > 0 && !full && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted">Suggested:</span>
          {suggestions.map((t, i) => (
            <TopicChip key={t} ref={value.length === 0 && i === 0 ? ref : undefined} topic={t} active={false} onClick={() => toggle(t)} />
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-56">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" aria-hidden />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                if (matches[0]) {
                  toggle(matches[0].id);
                  setQuery('');
                }
              }
            }}
            disabled={full}
            placeholder={full ? 'Limit reached' : 'Search topics'}
            aria-label="Search topics"
            className="h-9 w-full rounded-lg border border-border-strong/60 bg-surface pl-8 pr-2 text-[13px] placeholder:text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25 disabled:opacity-60"
          />
        </div>
        <button
          type="button"
          onClick={() => setBrowse((b) => !b)}
          aria-expanded={browse}
          className="inline-flex min-h-9 items-center gap-1 rounded-md px-2 text-[13px] font-medium text-accent hover:bg-accent/10"
        >
          {browse ? 'Hide all topics' : 'Browse all topics'}
          <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', browse && 'rotate-180')} aria-hidden />
        </button>
      </div>

      {matches.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {matches.map((t) => (
            <TopicChip
              key={t.id}
              topic={t.id}
              active={false}
              disabled={full}
              onClick={() => {
                toggle(t.id);
                setQuery('');
              }}
            />
          ))}
        </div>
      )}

      {browse && (
        <div className="space-y-2.5 rounded-lg border border-border bg-surface p-3">
          {TOPIC_CATEGORIES.map((cat) => (
            <div key={cat}>
              <p className="mb-1 text-[11px] font-medium uppercase tracking-wider text-muted">{TOPIC_CATEGORY_LABELS[cat]}</p>
              <div className="flex flex-wrap gap-1.5">
                {TOPICS.filter((t) => t.category === cat).map((t) => {
                  const on = value.includes(t.id);
                  return <TopicChip key={t.id} topic={t.id} active={on} disabled={full && !on} onClick={() => toggle(t.id)} />;
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});
