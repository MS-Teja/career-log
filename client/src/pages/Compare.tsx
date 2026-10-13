import { Fragment } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { X } from 'lucide-react';
import type { CompanyAnalytics, TopicId } from '@career-log/shared';
import { useCompanies, useCompare } from '@/api/hooks';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { PageHeader } from '@/components/PageHeader';
import { RoundSequence } from '@/components/RoundSequence';
import { Select } from '@/components/ui/Form';
import { Skeleton } from '@/components/ui/Skeleton';
import { topicInfo } from '@/lib/topics';
import { cn, pct } from '@/lib/utils';

const MAX = 3;

export default function Compare() {
  const [params, setParams] = useSearchParams();
  const slugs = (params.get('c') ?? '').split(',').filter(Boolean).slice(0, MAX);
  const { data: companies } = useCompanies();
  const { data, isLoading, error, refetch, isFetching } = useCompare(slugs);

  const setSlugs = (next: string[]) =>
    setParams((prev) => {
      const p = new URLSearchParams(prev);
      if (next.length) p.set('c', next.join(','));
      else p.delete('c');
      return p;
    });

  const options = (companies ?? []).filter((c) => (c.experienceCount ?? 0) > 0 && !slugs.includes(c.slug));

  return (
    <div className="container-page pb-16">
      <PageHeader
        title="Compare companies"
        description="Put up to three companies side by side: their process, difficulty and the topics they lean on."
      />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        {slugs.map((s) => (
          <span
            key={s}
            className="inline-flex min-h-9 items-center gap-1 rounded-full border border-border-strong/50 bg-surface pl-3 pr-1 text-sm font-medium"
          >
            {companies?.find((c) => c.slug === s)?.name ?? s}
            <button
              onClick={() => setSlugs(slugs.filter((x) => x !== s))}
              className="rounded-full p-1.5 text-muted hover:bg-surface-2 hover:text-ink"
              aria-label={`Remove ${s}`}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </span>
        ))}
        {slugs.length < MAX && (
          <div className="w-56">
            <Select aria-label="Add a company to compare" value="" onChange={(e) => e.target.value && setSlugs([...slugs, e.target.value])}>
              <option value="">+ Add a company</option>
              {options.map((c) => (
                <option key={c._id} value={c.slug}>
                  {c.name} ({c.experienceCount})
                </option>
              ))}
            </Select>
          </div>
        )}
      </div>

      {slugs.length === 0 ? (
        <EmptyState title="Pick companies to compare" description="Start with two you're deciding between, like Amazon and Microsoft." />
      ) : error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : isLoading || !data ? (
        <Skeleton className="h-96" />
      ) : (
        <div className={cn('overflow-x-auto rounded-lg border border-border bg-surface transition-opacity', isFetching && 'opacity-60')}>
          <CompareTable data={data} />
        </div>
      )}
    </div>
  );
}

function CompareTable({ data }: { data: CompanyAnalytics[] }) {
  // Topics anyone asks in ≥1 round, ranked by the highest share across the companies.
  const topicMax = new Map<TopicId, number>();
  for (const c of data) for (const t of c.topics) topicMax.set(t.topic, Math.max(topicMax.get(t.topic) ?? 0, t.share));
  const topics = [...topicMax.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([t]) => t);
  const share = (c: CompanyAnalytics, t: TopicId) => c.topics.find((x) => x.topic === t)?.share ?? 0;
  const cols = `minmax(150px,1.2fr) repeat(${data.length}, minmax(170px,1fr))`;

  const Row = ({ label, cells, className }: { label: React.ReactNode; cells: React.ReactNode[]; className?: string }) => (
    <div
      role="row"
      className={cn('grid items-center border-b border-border last:border-0', className)}
      style={{ gridTemplateColumns: cols }}
    >
      <div role="rowheader" className="px-4 py-3 text-[13px] text-muted">
        {label}
      </div>
      {cells.map((cell, i) => (
        <div role="cell" key={i} className="px-4 py-3 text-sm">
          {cell}
        </div>
      ))}
    </div>
  );

  return (
    <div role="table" aria-label="Company comparison" className="min-w-[520px]">
      <div role="row" className="sticky top-0 grid border-b border-border bg-surface" style={{ gridTemplateColumns: cols }}>
        <div role="columnheader" className="px-4 py-3" />
        {data.map((c) => (
          <div role="columnheader" key={c.company.slug} className="px-4 py-3">
            <Link to={`/companies/${c.company.slug}`} className="font-serif text-lg font-medium hover:underline">
              {c.company.name}
            </Link>
            <p className="meta">
              {c.experiences} experience{c.experiences === 1 ? '' : 's'}
            </p>
          </div>
        ))}
      </div>
      <Row
        label="Avg. rounds"
        cells={data.map((c) => (
          <span className="tabular-nums">{c.avgRounds}</span>
        ))}
      />
      <Row
        label="Selection rate"
        cells={data.map((c) =>
          c.selectionRate === null ? (
            '—'
          ) : (
            <span className="tabular-nums">
              {pct(c.selectionRate)}{' '}
              <span className="meta">
                ({c.selected}/{c.decided})
              </span>
            </span>
          ),
        )}
      />
      <Row
        label="Hard rounds"
        cells={data.map((c) => {
          const total = c.difficulty.reduce((s, d) => s + d.easy + d.medium + d.hard, 0);
          const hard = c.difficulty.reduce((s, d) => s + d.hard, 0);
          return total ? <span className="tabular-nums">{pct(hard / total)}</span> : '—';
        })}
      />
      <Row
        label="Typical process"
        cells={data.map((c) => (c.commonSequences[0] ? <RoundSequence types={c.commonSequences[0].sequence} /> : '—'))}
      />
      <div
        role="row"
        className="border-b border-border bg-surface-2/60 px-4 py-2 text-[11px] font-medium uppercase tracking-wider text-muted"
      >
        <span role="cell">Share of technical rounds asking each topic</span>
      </div>
      {topics.map((t) => {
        const info = topicInfo(t);
        const best = Math.max(...data.map((c) => share(c, t)));
        return (
          <Fragment key={t}>
            <Row
              label={<span className="font-medium text-ink">{info.label}</span>}
              cells={data.map((c) => {
                const v = share(c, t);
                return (
                  <div className="flex items-center gap-2">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
                      <div className={cn('h-full rounded-full', info.style.dot)} style={{ width: `${v * 100}%` }} />
                    </div>
                    <span className={cn('meta w-9 text-right', v === best && v > 0 && 'font-semibold text-ink')}>{v ? pct(v) : '—'}</span>
                  </div>
                );
              })}
            />
          </Fragment>
        );
      })}
    </div>
  );
}
