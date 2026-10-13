import { Link } from 'react-router-dom';
import { PenLine } from 'lucide-react';
import { useMyExperiences } from '@/api/hooks';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { ExperienceCard, ExperienceCardSkeleton } from '@/components/ExperienceCard';
import { PageHeader } from '@/components/PageHeader';
import { buttonClass } from '@/components/ui/Button';

export default function MyPosts() {
  const { data, isLoading, error, refetch } = useMyExperiences();
  return (
    <div className="container-page pb-16">
      <PageHeader
        title="My posts"
        description="Posts in review or with requested changes can be edited. Published posts are locked."
        action={
          <Link to="/submit" className={buttonClass('primary')}>
            <PenLine className="h-4 w-4" /> New experience
          </Link>
        }
      />
      {error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <ExperienceCardSkeleton key={i} />
          ))}
        </div>
      ) : data?.length ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((e) => (
            <ExperienceCard key={e._id} exp={e} showStatus showNote actions={false} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="You haven't shared anything yet"
          description="Your first experience helps every junior preparing for the same company."
          action={
            <Link to="/submit" className={buttonClass('primary')}>
              Share an experience
            </Link>
          }
        />
      )}
    </div>
  );
}
