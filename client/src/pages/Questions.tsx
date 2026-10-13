import { Link } from 'react-router-dom';
import { ROUND_TYPE_LABELS, type QuestionItem } from '@career-log/shared';
import { useQuestions, type QuestionFilters } from '@/api/hooks';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { FilterBar } from '@/components/FilterBar';
import { PageHeader } from '@/components/PageHeader';
import { Pagination } from '@/components/Pagination';
import { TopicChip } from '@/components/TopicChip';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/utils';
import { useUrlFilters } from './Browse';

const DIFF_TEXT = { easy: 'text-success', medium: 'text-warning', hard: 'text-danger' };

export function QuestionList({ filters, setPage, showCompany = true }: ReturnType<typeof useUrlFilters> & { showCompany?: boolean }) {
  const { data, isLoading, isFetching, error, refetch } = useQuestions(filters as QuestionFilters);
  if (error) return <ErrorState error={error} onRetry={refetch} />;
  return (
    <>
      <p className="meta mb-3 mt-4" aria-live="polite">
        {isLoading ? 'Loading…' : `${data?.total ?? 0} question${data?.total === 1 ? '' : 's'}`}
      </p>
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : data?.items.length ? (
        <ul
          className={cn('divide-y divide-border rounded-lg border border-border bg-surface transition-opacity', isFetching && 'opacity-60')}
        >
          {data.items.map((q) => (
            <QuestionRow key={q._id} q={q} showCompany={showCompany} />
          ))}
        </ul>
      ) : (
        <EmptyState title="No questions match" description="Try another topic or round type." />
      )}
      {data && <Pagination page={data.page} pages={data.pages} onChange={setPage} />}
    </>
  );
}

function QuestionRow({ q, showCompany }: { q: QuestionItem; showCompany: boolean }) {
  return (
    <li className="px-4 py-4 sm:px-5">
      <p className="meta flex flex-wrap gap-x-2">
        {showCompany && (
          <>
            <Link to={`/companies/${q.companySlug}`} className="font-sans text-[13px] font-medium text-ink hover:underline">
              {q.companyName}
            </Link>
            <span aria-hidden>·</span>
          </>
        )}
        <span>{q.role}</span>
        <span aria-hidden>·</span>
        <span>{q.year}</span>
        <span aria-hidden>·</span>
        <span>
          R{q.roundOrder} {ROUND_TYPE_LABELS[q.roundType]}
        </span>
        {q.difficulty && (
          <>
            <span aria-hidden>·</span>
            <span className={cn('capitalize', DIFF_TEXT[q.difficulty])}>{q.difficulty}</span>
          </>
        )}
      </p>
      <p className="prose-notebook mt-1.5 text-[16px] leading-relaxed">{q.summary}</p>
      {q.approach && (
        <p className="mt-1.5 whitespace-pre-line border-l-2 border-accent/40 pl-3 text-sm text-muted">
          <span className="font-medium text-ink/80">Approach: </span>
          {q.approach}
        </p>
      )}
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        {q.topics.map((t) => (
          <TopicChip key={t} topic={t} size="xs" />
        ))}
        <Link
          to={`/experiences/${q.experienceId}#round-${q.roundOrder}`}
          className="ml-auto inline-flex min-h-8 items-center text-[13px] font-medium text-accent hover:underline"
        >
          Full experience →
        </Link>
      </div>
    </li>
  );
}

export default function Questions() {
  const state = useUrlFilters();
  return (
    <div className="container-page pb-16">
      <PageHeader
        title="Question bank"
        description="Every question seniors logged, newest first. Filter by company and topic to build your practice list."
      />
      <FilterBar fields={['company', 'topic', 'roundType', 'year']} sort={false} placeholder="Search questions…" />
      <QuestionList {...state} />
    </div>
  );
}
