import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowBigUp, Bookmark } from 'lucide-react';
import type { Experience } from '@career-log/shared';
import { errorMessage } from '@/api/client';
import { useToggleBookmark, useToggleUpvote } from '@/api/hooks';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import { useToast } from './ui/Toast';

export function ExperienceActions({ exp, className }: { exp: Experience; className?: string }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const upvote = useToggleUpvote();
  const bookmark = useToggleBookmark();

  const guard = (fn: () => void) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      navigate('/login', { state: { from: location.pathname + location.search } });
      return;
    }
    fn();
  };
  const onError = (err: unknown) => toast(errorMessage(err), 'error');

  const toggleBookmark = (bookmarked: boolean) =>
    bookmark.mutate(
      { id: exp._id, bookmarked },
      {
        onSuccess: (r) =>
          toast(r.isBookmarked ? 'Saved to bookmarks' : 'Removed from bookmarks', 'success', {
            action: { label: 'Undo', onClick: () => bookmark.mutate({ id: exp._id, bookmarked: r.isBookmarked }) },
          }),
        onError,
      },
    );

  return (
    <div className={cn('flex items-center', className)}>
      <button
        onClick={guard(() => upvote.mutate(exp, { onError }))}
        aria-pressed={exp.hasUpvoted}
        aria-label={`Helpful, ${exp.upvoteCount} ${exp.upvoteCount === 1 ? 'vote' : 'votes'}`}
        className={cn(
          'inline-flex h-10 min-w-10 items-center justify-center gap-1 rounded-md px-2 text-[13px] font-medium tabular-nums transition-colors',
          exp.hasUpvoted ? 'bg-accent/10 text-accent' : 'text-muted hover:bg-surface-2 hover:text-ink',
        )}
      >
        <ArrowBigUp className={cn('h-4 w-4', exp.hasUpvoted && 'fill-current')} aria-hidden />
        {exp.upvoteCount}
      </button>
      <button
        onClick={guard(() => toggleBookmark(exp.isBookmarked))}
        aria-pressed={exp.isBookmarked}
        aria-label={exp.isBookmarked ? 'Remove bookmark' : 'Bookmark'}
        className={cn(
          'inline-flex h-10 w-10 items-center justify-center rounded-md transition-colors',
          exp.isBookmarked ? 'text-accent' : 'text-muted hover:bg-surface-2 hover:text-ink',
        )}
      >
        <Bookmark className={cn('h-4 w-4', exp.isBookmarked && 'fill-current')} aria-hidden />
      </button>
    </div>
  );
}
