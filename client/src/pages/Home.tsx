import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Search } from 'lucide-react';
import { useExperiences, useOverview } from '@/api/hooks';
import { ExperienceCard, ExperienceCardSkeleton } from '@/components/ExperienceCard';
import { StatTile } from '@/components/StatTile';
import { TopicBars } from '@/components/TopicBars';
import { Card, CardHeader } from '@/components/ui/Card';
import { Input } from '@/components/ui/Form';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAuth } from '@/context/AuthContext';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { buttonClass } from '@/components/ui/Button';

export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [q, setQ] = useState('');
  const overview = useOverview();
  const recent = useExperiences({}, 6);

  return (
    <div className="container-page pb-16">
      <section className="py-12 sm:py-16">
        <p className="meta uppercase tracking-wider">Placement experience vault</p>
        <h1 className="mt-3 max-w-3xl font-serif text-[38px] font-medium leading-[1.1] tracking-tight sm:text-display">
          Interview notes from the seniors <span className="italic text-accent">who’ve been there.</span>
        </h1>
        <p className="mt-4 max-w-xl text-[17px] text-muted">
          Every round, every question, tagged by topic, so you can see what each company actually asks before you walk in.
        </p>
        <form
          className="mt-7 flex max-w-xl gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            navigate(q.trim() ? `/browse?q=${encodeURIComponent(q.trim())}` : '/browse');
          }}
        >
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Try “Amazon”, “SDE”, or “graphs”"
              className="h-11 pl-9"
              aria-label="Search"
            />
          </div>
          <button type="submit" className={buttonClass('primary', 'lg')}>
            Search
          </button>
        </form>
      </section>

      {overview.error && (
        <div className="mb-6">
          <ErrorState error={overview.error} onRetry={overview.refetch} />
        </div>
      )}
      <section className="grid grid-cols-3 gap-3">
        {overview.isLoading || overview.error ? (
          [0, 1, 2].map((i) => <Skeleton key={i} className="h-[84px]" />)
        ) : (
          <>
            <StatTile label="Experiences" value={overview.data?.experiences ?? 0} />
            <StatTile label="Companies" value={overview.data?.companies ?? 0} />
            <StatTile label="Contributors" value={overview.data?.contributors ?? 0} />
          </>
        )}
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_340px]">
        <Card>
          <CardHeader
            title="What gets asked most"
            description="Share of technical rounds, across all companies, that included each topic"
          />
          <div className="p-3">
            {overview.isLoading ? (
              <div className="space-y-3 p-2">
                {Array.from({ length: 6 }, (_, i) => (
                  <Skeleton key={i} className="h-8" />
                ))}
              </div>
            ) : overview.data?.topTopics.length ? (
              <TopicBars topics={overview.data.topTopics} linkFor={(t) => `/browse?topic=${t}`} max={10} />
            ) : (
              <p className="p-4 text-sm text-muted">No data yet.</p>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Companies"
            action={
              <Link to="/companies" className="text-[13px] font-medium text-accent hover:underline">
                All
              </Link>
            }
          />
          {overview.isLoading && (
            <div className="space-y-2 p-4">
              {Array.from({ length: 5 }, (_, i) => (
                <Skeleton key={i} className="h-8" />
              ))}
            </div>
          )}
          {overview.data && overview.data.topCompanies.length === 0 && (
            <p className="p-5 text-sm text-muted">No companies with experiences yet.</p>
          )}
          <ul className="divide-y divide-border">
            {overview.data?.topCompanies.map((c) => (
              <li key={c._id}>
                <Link to={`/companies/${c.slug}`} className="flex min-h-11 items-center justify-between px-5 py-2.5 hover:bg-surface-2">
                  <span className="font-medium">{c.name}</span>
                  <span className="meta">{c.experienceCount} exp</span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </section>

      <section className="mt-12">
        <div className="mb-4 flex items-end justify-between">
          <h2 className="font-serif text-section font-medium">Recently shared</h2>
          <Link to="/browse" className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline">
            Browse all <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        {recent.error ? (
          <ErrorState error={recent.error} onRetry={recent.refetch} />
        ) : recent.data && recent.data.items.length === 0 ? (
          <EmptyState title="No experiences yet" description="The first seniors' posts will show up here." />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {recent.isLoading
              ? Array.from({ length: 6 }, (_, i) => <ExperienceCardSkeleton key={i} />)
              : recent.data?.items.map((e) => <ExperienceCard key={e._id} exp={e} />)}
          </div>
        )}
      </section>

      {!user && (
        <section className="mt-14 rounded-lg border border-border bg-surface-2/60 px-6 py-8 text-center">
          <h2 className="font-serif text-section font-medium">Placed already? Pay it forward.</h2>
          <p className="mx-auto mt-2 max-w-md text-muted">
            Sign up with your college email, get verified as a senior, and log your rounds in five minutes. You can stay anonymous.
          </p>
          <Link to="/register" className={buttonClass('primary', 'md', 'mt-5')}>
            Join Career Log
          </Link>
        </section>
      )}
    </div>
  );
}
