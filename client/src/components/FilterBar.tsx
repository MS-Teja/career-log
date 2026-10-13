import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import {
  OVERALL_RESULTS,
  ROUND_TYPE_LABELS,
  ROUND_TYPES,
  TOPIC_CATEGORIES,
  TOPIC_CATEGORY_LABELS,
  TOPICS,
  type RoundType,
} from '@career-log/shared';
import { useCompanies, useFacets } from '@/api/hooks';
import { topicInfo } from '@/lib/topics';
import { cn } from '@/lib/utils';
import { Button } from './ui/Button';
import { Input, Select } from './ui/Form';

const RESULT_LABELS = { selected: 'Selected', rejected: 'Not selected', waitlisted: 'Waitlisted', awaiting: 'Awaiting' };
type Key = 'company' | 'roundType' | 'topic' | 'year' | 'result';
const ALL_KEYS: Key[] = ['company', 'roundType', 'topic', 'year', 'result'];

/**
 * URL-driven filters. On desktop the selects sit under the search box; on mobile they open in
 * a bottom sheet. Active filters show as removable chips.
 */
export function FilterBar({
  fields = ALL_KEYS,
  sort = true,
  total,
  placeholder = 'Search companies, roles, questions…',
}: {
  fields?: Key[];
  sort?: boolean;
  /** Result count, shown on the mobile sheet's button. */
  total?: number;
  placeholder?: string;
}) {
  const [params, setParams] = useSearchParams();
  const { data: companies } = useCompanies();
  const { data: facets } = useFacets();
  const [q, setQ] = useState(params.get('q') ?? '');
  const [sheetOpen, setSheetOpen] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);

  // Updater form so a pending debounced search never overwrites a filter changed in the meantime.
  const set = (key: string, value: string) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value) next.set(key, value);
        else next.delete(key);
        next.delete('page');
        return next;
      },
      { replace: true },
    );

  useEffect(() => {
    const t = setTimeout(() => {
      if ((params.get('q') ?? '') !== q.trim()) set('q', q.trim());
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  // Keep the box in sync when the URL changes elsewhere (e.g. "Clear filters", back button).
  useEffect(() => {
    setQ(params.get('q') ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.get('q')]);

  useEffect(() => {
    if (!sheetOpen) return;
    sheetRef.current?.querySelector<HTMLElement>('select, button')?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setSheetOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [sheetOpen]);

  const active = fields.filter((k) => params.get(k));
  const label = (k: Key, v: string) => {
    if (k === 'company') return companies?.find((c) => c.slug === v)?.name ?? v;
    if (k === 'roundType') return ROUND_TYPE_LABELS[v as RoundType] ?? v;
    if (k === 'topic') return topicInfo(v).label;
    if (k === 'result') return RESULT_LABELS[v as keyof typeof RESULT_LABELS] ?? v;
    return v;
  };

  const clear = () =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        for (const k of [...fields, 'q', 'page']) next.delete(k);
        return next;
      },
      { replace: true },
    );

  const years = facets?.years.length ? facets.years : [];
  const selects = (
    <>
      {fields.includes('company') && (
        <Select aria-label="Company" value={params.get('company') ?? ''} onChange={(e) => set('company', e.target.value)}>
          <option value="">All companies</option>
          {companies?.map((c) => (
            <option key={c._id} value={c.slug}>
              {c.name}
            </option>
          ))}
        </Select>
      )}
      {fields.includes('roundType') && (
        <Select aria-label="Round type" value={params.get('roundType') ?? ''} onChange={(e) => set('roundType', e.target.value)}>
          <option value="">Any round</option>
          {ROUND_TYPES.map((t) => (
            <option key={t} value={t}>
              {ROUND_TYPE_LABELS[t]}
            </option>
          ))}
        </Select>
      )}
      {fields.includes('topic') && (
        <Select aria-label="Topic" value={params.get('topic') ?? ''} onChange={(e) => set('topic', e.target.value)}>
          <option value="">Any topic</option>
          {TOPIC_CATEGORIES.map((cat) => (
            <optgroup key={cat} label={TOPIC_CATEGORY_LABELS[cat]}>
              {TOPICS.filter((t) => t.category === cat).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </optgroup>
          ))}
        </Select>
      )}
      {fields.includes('year') && (
        <Select aria-label="Year" value={params.get('year') ?? ''} onChange={(e) => set('year', e.target.value)}>
          <option value="">Any year</option>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </Select>
      )}
      {fields.includes('result') && (
        <Select aria-label="Result" value={params.get('result') ?? ''} onChange={(e) => set('result', e.target.value)}>
          <option value="">Any result</option>
          {OVERALL_RESULTS.map((r) => (
            <option key={r} value={r}>
              {RESULT_LABELS[r]}
            </option>
          ))}
        </Select>
      )}
    </>
  );

  return (
    <div className="sticky top-14 z-20 -mx-4 border-b border-border bg-bg/90 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
          <Input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={placeholder}
            className="pl-9"
            aria-label="Search"
          />
        </div>
        {sort && (
          <Select
            aria-label="Sort"
            className="w-auto"
            value={params.get('sort') ?? 'recent'}
            onChange={(e) => set('sort', e.target.value === 'recent' ? '' : e.target.value)}
          >
            <option value="recent">Newest</option>
            <option value="top">Most helpful</option>
          </Select>
        )}
        <Button
          variant="secondary"
          size="icon"
          className="md:hidden"
          onClick={() => setSheetOpen(true)}
          aria-label={`Filters${active.length ? `, ${active.length} active` : ''}`}
          aria-expanded={sheetOpen}
          aria-controls="filter-sheet"
        >
          <SlidersHorizontal className="h-4 w-4" />
          {active.length > 0 && <span className="meta -ml-0.5 text-accent">{active.length}</span>}
        </Button>
      </div>

      <div className={cn('mt-2 hidden gap-2 md:grid', fields.length >= 5 ? 'md:grid-cols-5' : 'md:grid-cols-4')}>{selects}</div>

      {active.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {active.map((k) => (
            <button
              key={k}
              onClick={() => set(k, '')}
              className="inline-flex min-h-8 items-center gap-1 rounded-full border border-accent/30 bg-accent/10 px-2.5 text-xs font-medium text-accent hover:bg-accent/15"
              aria-label={`Remove filter ${label(k, params.get(k)!)}`}
            >
              {label(k, params.get(k)!)}
              <X className="h-3 w-3" aria-hidden />
            </button>
          ))}
          <button onClick={clear} className="min-h-8 px-2 text-xs text-muted hover:text-ink">
            Clear all
          </button>
        </div>
      )}

      {/* Mobile bottom sheet */}
      {sheetOpen && (
        <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal="true" aria-label="Filters" id="filter-sheet">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSheetOpen(false)} />
          <div
            ref={sheetRef}
            className="absolute inset-x-0 bottom-0 animate-fade-in rounded-t-2xl border-t border-border bg-surface p-4 pb-6 shadow-xl"
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border-strong/50" aria-hidden />
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold">Filters</h2>
              {active.length > 0 && (
                <button onClick={clear} className="min-h-9 px-2 text-sm text-muted hover:text-ink">
                  Clear all
                </button>
              )}
            </div>
            <div className="grid gap-2">{selects}</div>
            <Button className="mt-4 w-full" onClick={() => setSheetOpen(false)}>
              {total === undefined ? 'Done' : `Show ${total} result${total === 1 ? '' : 's'}`}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
