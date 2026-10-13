import { Link } from 'react-router-dom';
import { useBookmarks } from '@/api/hooks';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { ExperienceCard, ExperienceCardSkeleton } from '@/components/ExperienceCard';
import { PageHeader } from '@/components/PageHeader';
import { buttonClass } from '@/components/ui/Button';

export default function Bookmarks() {
  const { data, isLoading, error, refetch } = useBookmarks();
  return (
    <div className="container-page pb-16">
      <PageHeader title="Bookmarks" description="Experiences you saved for later." />
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
            <ExperienceCard key={e._id} exp={e} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="No bookmarks yet"
          description="Tap the bookmark icon on any experience to keep it here."
          action={
            <Link to="/browse" className={buttonClass('secondary')}>
              Browse experiences
            </Link>
          }
        />
      )}
    </div>
  );
}
