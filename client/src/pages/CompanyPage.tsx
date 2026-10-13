import { useEffect, useRef } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, GitCompare, ListChecks } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ROUND_TYPE_LABELS, type CompanyAnalytics } from '@career-log/shared';
import { useCompanyAnalytics, useExperiences, type ExperienceFilters } from '@/api/hooks';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { FilterBar } from '@/components/FilterBar';
import { RoundSequence } from '@/components/RoundSequence';
import { StatTile } from '@/components/StatTile';
import { TopicBars } from '@/components/TopicBars';
import { buttonClass } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { TabPanel, Tabs } from '@/components/ui/Tabs';
import { useCssColors } from '@/lib/useCssColor';
import { pct } from '@/lib/utils';
import { ExperienceResults, useUrlFilters } from './Browse';
import { QuestionList } from './Questions';

type View = 'overview' | 'questions' | 'experiences';

export default function CompanyPage() {
  const { slug = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const view = (params.get('view') as View) ?? 'overview';
  const { data, isLoading, error, refetch } = useCompanyAnalytics(slug);
  const tabsRef = useRef<HTMLDivElement>(null);

  const setView = (v: View) =>
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      if (v === 'overview') next.delete('view');
      else next.set('view', v);
      next.delete('page');
      return next;
    });

  // Clicking a topic bar switches to its questions; bring them into view.
  const topic = params.get('topic');
  useEffect(() => {
    if (topic && view === 'questions') tabsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [topic, view]);

  if (error)
    return (
      <div className="container-page py-10">
        <ErrorState error={error} onRetry={refetch} />
      </div>
    );

  return (
    <div className="container-page pb-16">
      <Link to="/companies" className="mt-6 inline-flex min-h-9 items-center gap-1 text-sm text-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" aria-hidden /> Companies
      </Link>
      {isLoading || !data ? (
        <div className="mt-4 space-y-4">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-[84px]" />
            ))}
          </div>
          <Skeleton className="h-72" />
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-4 pb-6 pt-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="page-title">{data.company.name}</h1>
              {data.roles.length > 0 && <p className="mt-1.5 text-muted">Roles: {data.roles.join(', ')}</p>}
            </div>
            <div className="flex gap-2">
              <Link to={`/compare?c=${slug}`} className={buttonClass('secondary', 'sm')}>
                <GitCompare className="h-4 w-4" aria-hidden /> Compare
              </Link>
              <Link to={`/prep?add=${slug}`} className={buttonClass('secondary', 'sm')}>
                <ListChecks className="h-4 w-4" aria-hidden /> Add to my prep
              </Link>
            </div>
          </div>

          <div ref={tabsRef} className="scroll-mt-16">
            <Tabs
              id="company"
              value={view}
              onChange={setView}
              items={[
                { value: 'overview', label: 'Overview' },
                { value: 'questions', label: 'Questions' },
                { value: 'experiences', label: 'Experiences', count: data.experiences },
              ]}
            />
          </div>
          <TabPanel id="company" value={view} className="pt-6">
            {view === 'overview' &&
              (data.experiences === 0 ? (
                <EmptyState
                  title="No published experiences yet"
                  description="Once seniors share their rounds here, you'll see the topic breakdown."
                />
              ) : (
                <Analytics data={data} slug={slug} />
              ))}
            {view === 'questions' && <CompanyQuestions slug={slug} />}
            {view === 'experiences' && <CompanyExperiences slug={slug} />}
          </TabPanel>
        </>
      )}
    </div>
  );
}

function CompanyQuestions({ slug }: { slug: string }) {
  const state = useUrlFilters({ company: slug, view: undefined });
  return (
    <>
      <FilterBar fields={['topic', 'roundType', 'year']} sort={false} placeholder="Search this company's questions…" />
      <QuestionList {...state} showCompany={false} />
    </>
  );
}

function CompanyExperiences({ slug }: { slug: string }) {
  const { filters, setPage } = useUrlFilters({ company: slug, view: undefined });
  const query = useExperiences(filters as ExperienceFilters);
  return (
    <>
      <FilterBar fields={['roundType', 'topic', 'year', 'result']} total={query.data?.total} />
      <ExperienceResults query={query} setPage={setPage} />
    </>
  );
}

function Analytics({ data, slug }: { data: CompanyAnalytics; slug: string }) {
  const c = useCssColors(['accent', 'success', 'muted', 'border', 'surface', 'ink'] as const);
  const tooltipStyle = { background: c.surface, border: `1px solid ${c.border}`, borderRadius: 8, fontSize: 13, color: c.ink };
  const axis = { stroke: c.muted, fontSize: 12, tickLine: false, axisLine: false };
  // Real translucent colours (not fillOpacity) so the legend swatches match the bars.
  const tint = (alpha: number) => c.accent.replace(')', ` / ${alpha})`);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile label="Experiences" value={data.experiences} />
        <StatTile label="Avg. rounds" value={data.avgRounds} />
        <StatTile
          label="Selection rate"
          value={data.selectionRate === null ? '—' : pct(data.selectionRate)}
          hint={data.decided ? `${data.selected} of ${data.decided} with a final result` : 'No final results yet'}
        />
        <StatTile label="Technical rounds logged" value={data.technicalRounds} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader
            title="Topics asked in technical rounds"
            description={`Share of ${data.technicalRounds} OA, coding, technical and design rounds that included each topic. Click one to see its questions.`}
          />
          <div className="p-3">
            {data.topics.length ? (
              <TopicBars
                topics={data.topics}
                max={14}
                totalRounds={data.technicalRounds}
                linkFor={(t) => `/companies/${slug}?view=questions&topic=${t}`}
              />
            ) : (
              <p className="p-3 text-sm text-muted">No tagged questions yet.</p>
            )}
          </div>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Typical process" description="Most common sequences of rounds" />
            <ul className="divide-y divide-border">
              {data.commonSequences.map((s, i) => (
                <li key={i} className="px-5 py-3">
                  <RoundSequence types={s.sequence} />
                  <p className="meta mt-1.5">
                    {s.count} of {data.experiences} experiences
                  </p>
                </li>
              ))}
            </ul>
          </Card>

          {data.byYear.length > 0 && (
            <Card>
              <CardHeader title="By year" description="Experiences shared, and how many ended in an offer" />
              <div className="h-52 px-2 py-3">
                <ResponsiveContainer>
                  <BarChart data={data.byYear} barGap={2}>
                    <CartesianGrid vertical={false} stroke={c.border} />
                    <XAxis dataKey="year" {...axis} />
                    <YAxis allowDecimals={false} width={24} {...axis} />
                    <Tooltip contentStyle={tooltipStyle} cursor={{ fill: c.border, opacity: 0.4 }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar isAnimationActive={false} dataKey="count" name="Shared" fill={tint(0.4)} radius={[4, 4, 0, 0]} maxBarSize={28} />
                    <Bar
                      isAnimationActive={false}
                      dataKey="selected"
                      name="Selected"
                      fill={c.accent}
                      radius={[4, 4, 0, 0]}
                      maxBarSize={28}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}
        </div>
      </div>

      {data.difficulty.length > 0 && (
        <Card>
          <CardHeader title="Difficulty by round type" description="How seniors rated each kind of round (lighter = easier)" />
          <div className="h-64 px-2 py-4">
            <ResponsiveContainer>
              <BarChart
                data={data.difficulty.map((d) => ({ ...d, label: ROUND_TYPE_LABELS[d.type] }))}
                layout="vertical"
                margin={{ left: 8, right: 16 }}
              >
                <CartesianGrid horizontal={false} stroke={c.border} />
                <XAxis type="number" allowDecimals={false} {...axis} />
                <YAxis type="category" dataKey="label" width={130} {...axis} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: c.border, opacity: 0.4 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {/* Single-hue lightness ramp: readable without relying on red vs green. */}
                <Bar isAnimationActive={false} dataKey="easy" name="Easy" stackId="d" fill={tint(0.25)} maxBarSize={22} />
                <Bar isAnimationActive={false} dataKey="medium" name="Medium" stackId="d" fill={tint(0.6)} maxBarSize={22} />
                <Bar
                  isAnimationActive={false}
                  dataKey="hard"
                  name="Hard"
                  stackId="d"
                  fill={c.accent}
                  radius={[0, 4, 4, 0]}
                  maxBarSize={22}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}
    </div>
  );
}
