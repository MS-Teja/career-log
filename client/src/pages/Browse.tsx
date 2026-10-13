import { useSearchParams } from 'react-router-dom';
import type { UseQueryResult } from '@tanstack/react-query';
import type { Experience, Paginated } from '@career-log/shared';
import { useExperiences, type ExperienceFilters } from '@/api/hooks';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { ExperienceCard, ExperienceCardSkeleton } from '@/components/ExperienceCard';
import { FilterBar } from '@/components/FilterBar';
import { PageHeader } from '@/components/PageHeader';
import { Pagination } from '@/components/Pagination';

/** Reads filters from the URL (plus fixed extras such as the company on a company page). */
export function useUrlFilters<T extends Record<string, string | undefined>>(extra?: T) {
  const [params, setParams] = useSearchParams();
  const filters = { ...Object.fromEntries(params.entries()), ...extra } as Record<string, string>;
  const setPage = (p: number) => {
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      if (p > 1) next.set('page', String(p));
      else next.delete('page');
      return next;
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  return { filters, setPage };
}

export function ExperienceResults({ query, setPage }: { query: UseQueryResult<Paginated<Experience>>; setPage: (p: number) => void }) {
  const { data, isLoading, isFetching, error, refetch } = query;
  if (error) return <ErrorState error={error} onRetry={refetch} />;
  return (
    <>
      <p className="meta mb-3 mt-4" aria-live="polite">
        {isLoading ? 'Loading…' : `${data?.total ?? 0} experience${data?.total === 1 ? '' : 's'}`}
      </p>
      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <ExperienceCardSkeleton key={i} />
          ))}
        </div>
      ) : data?.items.length ? (
        <div className={`grid gap-3 transition-opacity sm:grid-cols-2 lg:grid-cols-3 ${isFetching ? 'opacity-60' : ''}`}>
          {data.items.map((e) => (
            <ExperienceCard key={e._id} exp={e} />
          ))}
        </div>
      ) : (
        <EmptyState title="Nothing matches yet" description="Try removing a filter or searching for something broader." />
      )}
      {data && <Pagination page={data.page} pages={data.pages} onChange={setPage} />}
    </>
  );
}

export default function Browse() {
  const { filters, setPage } = useUrlFilters();
  const query = useExperiences(filters as ExperienceFilters);
  return (
    <div className="container-page pb-16">
      <PageHeader title="Browse experiences" description="Filter by company, round type or topic to see exactly what was asked." />
      <FilterBar total={query.data?.total} />
      <ExperienceResults query={query} setPage={setPage} />
    </div>
  );
}
