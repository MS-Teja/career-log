import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { GitCompare, Search } from 'lucide-react';
import { buttonClass } from '@/components/ui/Button';
import { useCompanies } from '@/api/hooks';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { PageHeader } from '@/components/PageHeader';
import { Input } from '@/components/ui/Form';
import { Skeleton } from '@/components/ui/Skeleton';

export default function Companies() {
  const { data, isLoading, error, refetch } = useCompanies();
  const [q, setQ] = useState('');
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (data ?? [])
      .filter((c) => !s || c.name.toLowerCase().includes(s) || c.aliases.some((a) => a.includes(s)))
      .sort((a, b) => (b.experienceCount ?? 0) - (a.experienceCount ?? 0) || a.name.localeCompare(b.name));
  }, [data, q]);

  return (
    <div className="container-page pb-16">
      <PageHeader
        title="Companies"
        description="Open a company to see its round pattern and the topics it asks most."
        action={
          <Link to="/compare" className={buttonClass('secondary', 'sm')}>
            <GitCompare className="h-4 w-4" aria-hidden /> Compare companies
          </Link>
        }
      />
      <div className="relative mb-5 max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Filter companies"
          className="pl-9"
          aria-label="Filter companies"
        />
      </div>
      {error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      ) : filtered.length ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {filtered.map((c) => (
            <Link
              key={c._id}
              to={`/companies/${c.slug}`}
              className="rounded-lg border border-border bg-surface px-4 py-4 transition-colors hover:border-border-strong"
            >
              <div className="font-semibold">{c.name}</div>
              <div className="meta mt-1">
                {c.experienceCount ? `${c.experienceCount} experience${c.experienceCount === 1 ? '' : 's'}` : 'No experiences yet'}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState title="No companies found" />
      )}
    </div>
  );
}
