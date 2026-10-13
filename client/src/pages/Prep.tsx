import { useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowRight, X } from 'lucide-react';
import { MAX_PREP_COMPANIES, type PrepPlan, type TopicId } from '@career-log/shared';
import { errorMessage } from '@/api/client';
import { useCompanies, usePrep, useSavePrep } from '@/api/hooks';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { PageHeader } from '@/components/PageHeader';
import { Card } from '@/components/ui/Card';
import { Select } from '@/components/ui/Form';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { topicInfo } from '@/lib/topics';
import { cn, pct } from '@/lib/utils';

export default function Prep() {
  const { data: plan, isLoading, error, refetch } = usePrep();
  const { data: companies } = useCompanies();
  const save = useSavePrep();
  const qc = useQueryClient();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const handledAdd = useRef(false);

  const persist = (companySlugs: string[], done: TopicId[]) => {
    // Optimistically tick boxes; the server returns the re-ranked plan.
    qc.setQueryData<PrepPlan>(['prep'], (old) =>
      old ? { ...old, done, topics: old.topics.map((t) => ({ ...t, done: done.includes(t.topic) })) } : old,
    );
    save.mutate({ companies: companySlugs, done }, { onError: (e) => toast(errorMessage(e), 'error') });
  };

  const slugs = plan?.companies.map((c) => c.slug) ?? [];

  // "Add to my prep" from a company page lands here with ?add=slug.
  useEffect(() => {
    const add = params.get('add');
    if (!plan || !add || handledAdd.current) return;
    handledAdd.current = true;
    setParams((p) => {
      const n = new URLSearchParams(p);
      n.delete('add');
      return n;
    });
    if (slugs.includes(add)) return;
    if (slugs.length >= MAX_PREP_COMPANIES) {
      toast(`You can track up to ${MAX_PREP_COMPANIES} companies`, 'error');
      return;
    }
    persist([...slugs, add], plan.done);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan, params]);

  if (error)
    return (
      <div className="container-page py-10">
        <ErrorState error={error} onRetry={refetch} />
      </div>
    );

  const toggle = (t: TopicId) => {
    if (!plan) return;
    persist(slugs, plan.done.includes(t) ? plan.done.filter((x) => x !== t) : [...plan.done, t]);
  };

  const totalWeight = plan?.topics.reduce((s, t) => s + t.weight, 0) ?? 0;
  const doneWeight = plan?.topics.filter((t) => t.done).reduce((s, t) => s + t.weight, 0) ?? 0;
  const coverage = totalWeight ? doneWeight / totalWeight : 0;
  const options = (companies ?? []).filter((c) => (c.experienceCount ?? 0) > 0 && !slugs.includes(c.slug));

  return (
    <div className="container-page pb-16">
      <PageHeader
        title="My prep plan"
        description="Pick the companies you're targeting. Topics are ranked by how often those companies ask them; tick them off as you practise."
      />

      {isLoading || !plan ? (
        <Skeleton className="h-80" />
      ) : (
        <>
          <div className="mb-6 flex flex-wrap items-center gap-2">
            {plan.companies.map((c) => (
              <span
                key={c.slug}
                className="inline-flex min-h-9 items-center gap-1 rounded-full border border-border-strong/50 bg-surface pl-3 pr-1 text-sm font-medium"
              >
                <Link to={`/companies/${c.slug}`} className="hover:underline">
                  {c.name}
                </Link>
                <button
                  onClick={() =>
                    persist(
                      slugs.filter((s) => s !== c.slug),
                      plan.done,
                    )
                  }
                  className="rounded-full p-1.5 text-muted hover:bg-surface-2 hover:text-ink"
                  aria-label={`Remove ${c.name}`}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            ))}
            {slugs.length < MAX_PREP_COMPANIES && (
              <div className="w-60">
                <Select
                  aria-label="Add a target company"
                  value=""
                  onChange={(e) => e.target.value && persist([...slugs, e.target.value], plan.done)}
                >
                  <option value="">+ Add a target company</option>
                  {options.map((c) => (
                    <option key={c._id} value={c.slug}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </div>
            )}
          </div>

          {plan.companies.length === 0 ? (
            <EmptyState
              title="No target companies yet"
              description="Add one or more companies above to get a ranked list of topics to prepare."
            />
          ) : plan.topics.length === 0 ? (
            <EmptyState title="Not enough data yet" description="These companies don't have tagged technical questions yet." />
          ) : (
            <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
              <Card className="order-2 lg:order-1">
                <ul className="divide-y divide-border">
                  {plan.topics.map((t) => {
                    const info = topicInfo(t.topic);
                    const practice = `/questions?topic=${t.topic}${plan.companies.length === 1 ? `&company=${plan.companies[0]!.slug}` : ''}`;
                    return (
                      <li key={t.topic} className={cn('flex items-start gap-3 px-4 py-3', t.done && 'bg-surface-2/40')}>
                        <input
                          type="checkbox"
                          id={`prep-${t.topic}`}
                          checked={t.done}
                          onChange={() => toggle(t.topic)}
                          className="mt-1 h-5 w-5 shrink-0 cursor-pointer accent-[rgb(var(--accent))]"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                            <label
                              htmlFor={`prep-${t.topic}`}
                              className={cn('cursor-pointer font-medium', t.done && 'text-muted line-through')}
                            >
                              {info.label}
                            </label>
                            <span className="meta">
                              <span className="text-ink">{pct(t.weight)}</span> avg · {t.questions} question{t.questions === 1 ? '' : 's'}
                            </span>
                          </div>
                          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-2">
                            <div
                              className={cn('h-full rounded-full', info.style.dot, t.done && 'opacity-40')}
                              style={{ width: `${t.weight * 100}%` }}
                            />
                          </div>
                          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                            {plan.companies.length > 1 &&
                              plan.companies.map((c) => (
                                <span key={c.slug} className="meta">
                                  {c.name} {t.perCompany[c.slug] ? pct(t.perCompany[c.slug]!) : '—'}
                                </span>
                              ))}
                            <Link
                              to={practice}
                              className="ml-auto inline-flex min-h-8 items-center gap-1 text-[13px] font-medium text-accent hover:underline"
                            >
                              Practice <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                            </Link>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </Card>

              <aside className="order-1 lg:order-2">
                <Card className="p-5 lg:sticky lg:top-20">
                  <p className="text-[13px] text-muted">Coverage</p>
                  <p className="mt-1 text-[32px] font-semibold leading-none tabular-nums">{pct(coverage)}</p>
                  <div
                    className="mt-3 h-2 overflow-hidden rounded-full bg-surface-2"
                    role="progressbar"
                    aria-valuenow={Math.round(coverage * 100)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label="Prep coverage"
                  >
                    <div className="h-full rounded-full bg-accent transition-[width]" style={{ width: `${coverage * 100}%` }} />
                  </div>
                  <p className="mt-3 text-[13px] text-muted">
                    {plan.done.length} of {plan.topics.length} topics done, weighted by how often they come up.
                  </p>
                  {plan.topics.find((t) => !t.done) && (
                    <p className="mt-4 text-sm">
                      Next up: <span className="font-medium">{topicInfo(plan.topics.find((t) => !t.done)!.topic).label}</span>
                    </p>
                  )}
                </Card>
              </aside>
            </div>
          )}
        </>
      )}
    </div>
  );
}
