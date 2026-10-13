import { useState } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';
import { Check, ChevronDown, Flag, X } from 'lucide-react';
import { REPORT_FLAG_THRESHOLD, type Experience } from '@career-log/shared';
import { errorMessage } from '@/api/client';
import { useModerate } from '@/api/hooks';
import { authorLine } from '@/components/ExperienceCard';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { ExperienceArticle } from '@/components/ExperienceArticle';
import { ResultBadge } from '@/components/ResultBadge';
import { RoundSequence } from '@/components/RoundSequence';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { cn, timeAgo } from '@/lib/utils';
import { MODERATION_PRESETS, ReasonForm } from '../ExperienceDetail';

type Mode = 'pending' | 'reported' | 'rejected';

export function ReviewList({ query, mode }: { query: UseQueryResult<Experience[]>; mode: Mode }) {
  const [openId, setOpenId] = useState<string | null>(null);
  if (query.error) return <ErrorState error={query.error} onRetry={query.refetch} />;
  if (query.isLoading)
    return (
      <div className="space-y-2">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
    );
  if (!query.data?.length)
    return (
      <EmptyState
        title={mode === 'pending' ? 'All caught up' : mode === 'reported' ? 'No reports' : 'Nothing here'}
        description={mode === 'pending' ? 'New submissions will appear here.' : undefined}
      />
    );

  return (
    <ul className="space-y-2">
      {query.data.map((exp) => (
        <ReviewItem
          key={exp._id}
          exp={exp}
          mode={mode}
          open={openId === exp._id}
          onToggle={() => setOpenId(openId === exp._id ? null : exp._id)}
        />
      ))}
    </ul>
  );
}

function ReviewItem({ exp, mode, open, onToggle }: { exp: Experience; mode: Mode; open: boolean; onToggle: () => void }) {
  const moderate = useModerate();
  const toast = useToast();
  const [dialog, setDialog] = useState<null | 'reject' | 'unpublish'>(null);
  const [reason, setReason] = useState('');
  const flagged = (exp.reportCount ?? 0) >= REPORT_FLAG_THRESHOLD;

  const act = (body: Parameters<typeof moderate.mutate>[0], msg: string) =>
    moderate.mutate(body, {
      onSuccess: () => {
        // Approving is the one action that's easy to do by accident, so offer an undo.
        toast(
          msg,
          'success',
          body.action === 'approve'
            ? { action: { label: 'Undo', onClick: () => moderate.mutate({ id: exp._id, action: 'requeue' }) } }
            : undefined,
        );
        setDialog(null);
        setReason('');
      },
      onError: (e) => toast(errorMessage(e), 'error'),
    });

  return (
    <li className="rounded-lg border border-border bg-surface">
      <button
        onClick={onToggle}
        className="flex min-h-14 w-full items-center gap-4 px-4 py-3 text-left hover:bg-surface-2/50"
        aria-expanded={open}
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">{exp.companyName}</span>
            <span className="text-sm text-muted">{exp.role}</span>
            <ResultBadge result={exp.overallResult} />
            {mode === 'reported' && (
              <Badge tone={flagged ? 'danger' : 'warning'}>
                <Flag className="h-3 w-3" /> {exp.reportCount} report{exp.reportCount === 1 ? '' : 's'}
              </Badge>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
            <RoundSequence types={exp.rounds.map((r) => r.type)} />
            <span className="meta">
              {authorLine(exp)} · {timeAgo(exp.updatedAt)}
            </span>
          </div>
        </div>
        <ChevronDown className={cn('h-4 w-4 shrink-0 text-muted transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="border-t border-border">
          {mode === 'reported' && exp.reports?.length ? (
            <div className="border-b border-border bg-danger/5 px-4 py-3">
              <p className="mb-1 text-[13px] font-medium">Reports</p>
              <ul className="space-y-1 text-sm">
                {exp.reports.map((r, i) => (
                  <li key={i} className="text-ink/85">
                    “{r.reason}” <span className="meta">· {timeAgo(r.at)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {mode === 'rejected' && exp.rejectionReason && (
            <p className="border-b border-border bg-surface-2 px-4 py-3 text-sm">
              <span className="font-medium">Your note:</span> {exp.rejectionReason}
            </p>
          )}

          <div className="px-4 py-8 lg:max-h-[70vh] lg:overflow-y-auto">
            <ExperienceArticle data={{ ...exp, byline: authorLine(exp) }} />
          </div>

          <div className="flex flex-wrap justify-end gap-2 border-t border-border px-4 py-3">
            {mode === 'pending' && (
              <>
                <Button variant="secondary" onClick={() => setDialog('reject')}>
                  <X className="h-4 w-4" /> Request changes
                </Button>
                <Button loading={moderate.isPending} onClick={() => act({ id: exp._id, action: 'approve' }, 'Published')}>
                  <Check className="h-4 w-4" /> Approve & publish
                </Button>
              </>
            )}
            {mode === 'reported' && (
              <>
                <Button variant="secondary" onClick={() => act({ id: exp._id, action: 'dismiss-reports' }, 'Reports dismissed')}>
                  Dismiss reports
                </Button>
                <Button variant="danger" onClick={() => setDialog('unpublish')}>
                  Unpublish
                </Button>
              </>
            )}
            {mode === 'rejected' && (
              <Button variant="secondary" onClick={() => act({ id: exp._id, action: 'approve' }, 'Published')}>
                <Check className="h-4 w-4" /> Approve anyway
              </Button>
            )}
          </div>
        </div>
      )}

      <Dialog
        open={dialog !== null}
        onClose={() => setDialog(null)}
        title={dialog === 'reject' ? 'Request changes' : 'Unpublish post'}
        description="The author sees this note and can edit and resubmit."
      >
        <ReasonForm
          label="Note to author"
          presets={MODERATION_PRESETS}
          reason={reason}
          setReason={setReason}
          submitLabel={dialog === 'reject' ? 'Send back' : 'Unpublish'}
          loading={moderate.isPending}
          onCancel={() => setDialog(null)}
          onSubmit={() =>
            act(
              { id: exp._id, action: dialog === 'reject' ? 'reject' : 'unpublish', reason },
              dialog === 'reject' ? 'Sent back to author' : 'Unpublished',
            )
          }
        />
      </Dialog>
    </li>
  );
}
