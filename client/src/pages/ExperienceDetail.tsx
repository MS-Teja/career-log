import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Flag, Pencil, Trash2 } from 'lucide-react';
import { errorMessage } from '@/api/client';
import { useDeleteExperience, useExperience, useModerate, useReportExperience } from '@/api/hooks';
import { authorLine } from '@/components/ExperienceCard';
import { ErrorState } from '@/components/ErrorState';
import { ExperienceActions } from '@/components/ExperienceActions';
import { ExperienceArticle } from '@/components/ExperienceArticle';
import { StatusBadge } from '@/components/ResultBadge';
import { Button, buttonClass } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Field, Textarea } from '@/components/ui/Form';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';

export default function ExperienceDetail() {
  const { id } = useParams();
  const location = useLocation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const { data: exp, isLoading, error, refetch } = useExperience(id);
  const del = useDeleteExperience();
  const report = useReportExperience();
  const moderate = useModerate();
  const [dialog, setDialog] = useState<null | 'report' | 'delete' | 'unpublish'>(null);

  // Deep links from the question bank (#round-2) scroll to that round once it renders.
  useEffect(() => {
    if (exp && location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView({ block: 'start' });
  }, [exp, location.hash]);
  const [reason, setReason] = useState('');

  if (isLoading)
    return (
      <div className="container-page max-w-prose space-y-4 py-12">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-12 w-3/4" />
        <Skeleton className="h-60" />
      </div>
    );
  if (error || !exp)
    return (
      <div className="container-page py-12">
        <ErrorState error={error} onRetry={refetch} />
      </div>
    );

  const isAdmin = user?.role === 'admin';
  const close = () => {
    setDialog(null);
    setReason('');
  };

  return (
    <div className="container-page pb-20">
      <div className="mx-auto max-w-prose pt-6">
        {/* Go back to wherever the reader came from (keeps their filters); fall back to the company. */}
        {location.key !== 'default' ? (
          <button onClick={() => navigate(-1)} className="inline-flex min-h-9 items-center gap-1 text-sm text-muted hover:text-ink">
            <ArrowLeft className="h-4 w-4" aria-hidden /> Back
          </button>
        ) : (
          <Link to={`/companies/${exp.companySlug}`} className="inline-flex min-h-9 items-center gap-1 text-sm text-muted hover:text-ink">
            <ArrowLeft className="h-4 w-4" aria-hidden /> {exp.companyName}
          </Link>
        )}

        {exp.status !== 'approved' && (
          <div
            className={cn(
              'mt-4 rounded-lg border px-4 py-3 text-sm',
              exp.status === 'rejected' ? 'border-danger/30 bg-danger/5' : 'border-warning/30 bg-warning/5',
            )}
          >
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={exp.status} />
              <span className="text-muted">
                {exp.status === 'pending' ? 'Waiting for the placement cell. ' : ''}Only you and admins can see this.
              </span>
            </div>
            {exp.rejectionReason && (
              <p className="mt-2">
                <span className="font-medium">Admin note:</span> {exp.rejectionReason}
              </p>
            )}
            {exp.isOwner && exp.status === 'rejected' && (
              <Link to={`/experiences/${exp._id}/edit`} className={buttonClass('primary', 'sm', 'mt-3')}>
                <Pencil className="h-3.5 w-3.5" aria-hidden /> Edit & resubmit
              </Link>
            )}
          </div>
        )}
      </div>

      <div className="mt-6">
        <ExperienceArticle
          data={{
            ...exp,
            byline: authorLine(exp),
            dateLabel: new Date(exp.createdAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }),
          }}
          aside={
            <div className="flex flex-wrap items-center gap-2">
              {exp.status === 'approved' && <ExperienceActions exp={exp} className="-ml-2" />}
              <div className="ml-auto flex items-center gap-1">
                {exp.isOwner && exp.status !== 'approved' && (
                  <Link to={`/experiences/${exp._id}/edit`} className={buttonClass('secondary', 'sm')}>
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </Link>
                )}
                {(exp.isOwner || isAdmin) && (
                  <Button variant="danger-ghost" size="sm" onClick={() => setDialog('delete')}>
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </Button>
                )}
                {isAdmin && exp.status === 'approved' && (
                  <Button variant="secondary" size="sm" onClick={() => setDialog('unpublish')}>
                    Unpublish
                  </Button>
                )}
                {user && !exp.isOwner && exp.status === 'approved' && (
                  <Button variant="ghost" size="sm" onClick={() => setDialog('report')}>
                    <Flag className="h-3.5 w-3.5" /> Report
                  </Button>
                )}
              </div>
            </div>
          }
        />
        <div className="mx-auto mt-12 max-w-prose border-t border-border pt-6">
          <Link to={`/companies/${exp.companySlug}`} className="text-sm font-medium text-accent hover:underline">
            See every {exp.companyName} experience and topic breakdown →
          </Link>
        </div>
      </div>

      <Dialog
        open={dialog === 'report'}
        onClose={close}
        title="Report this post"
        description="For example: it shares a verbatim test question under NDA, is inaccurate, or isn't a real experience."
      >
        <ReasonForm
          label="What's wrong?"
          reason={reason}
          setReason={setReason}
          submitLabel="Send report"
          loading={report.isPending}
          onCancel={close}
          onSubmit={() =>
            report.mutate(
              { id: exp._id, reason },
              {
                onSuccess: () => {
                  toast('Thanks, an admin will take a look');
                  close();
                },
                onError: (e) => toast(errorMessage(e), 'error'),
              },
            )
          }
        />
      </Dialog>

      <Dialog
        open={dialog === 'unpublish'}
        onClose={close}
        title="Unpublish post"
        description="The author will see your note and can edit and resubmit."
      >
        <ReasonForm
          label="Note to author"
          presets={MODERATION_PRESETS}
          reason={reason}
          setReason={setReason}
          submitLabel="Unpublish"
          loading={moderate.isPending}
          onCancel={close}
          onSubmit={() =>
            moderate.mutate(
              { id: exp._id, action: 'unpublish', reason },
              {
                onSuccess: () => {
                  toast('Post unpublished');
                  close();
                },
                onError: (e) => toast(errorMessage(e), 'error'),
              },
            )
          }
        />
      </Dialog>

      <Dialog open={dialog === 'delete'} onClose={close} title="Delete this experience?" description="This can't be undone.">
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button
            variant="danger"
            loading={del.isPending}
            onClick={() =>
              del.mutate(exp._id, {
                onSuccess: () => {
                  toast('Experience deleted');
                  navigate(exp.isOwner ? '/me/posts' : '/browse', { replace: true });
                },
                onError: (e) => toast(errorMessage(e), 'error'),
              })
            }
          >
            Delete
          </Button>
        </div>
      </Dialog>
    </div>
  );
}

export const MODERATION_PRESETS = [
  'Please describe the questions in your own words instead of pasting the exact test question (NDA).',
  'Add a bit more detail: what was asked in each round and how you approached it.',
  'The company or role looks wrong. Please double-check and resubmit.',
  'This looks like a duplicate of another post.',
];

export function ReasonForm({
  label,
  presets,
  reason,
  setReason,
  submitLabel,
  loading,
  onCancel,
  onSubmit,
}: {
  label: string;
  presets?: string[];
  reason: string;
  setReason: (s: string) => void;
  submitLabel: string;
  loading: boolean;
  onCancel: () => void;
  onSubmit: () => void;
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="space-y-4"
    >
      {presets && (
        <div className="flex flex-col gap-1.5">
          {presets.map((p) => (
            <button
              type="button"
              key={p}
              onClick={() => setReason(p)}
              className={cn(
                'rounded-md border px-3 py-2 text-left text-[13px] transition-colors',
                reason === p ? 'border-accent bg-accent/5' : 'border-border hover:bg-surface-2',
              )}
            >
              {p}
            </button>
          ))}
        </div>
      )}
      <Field label={label}>
        {(id) => <Textarea id={id} value={reason} onChange={(e) => setReason(e.target.value)} autoFocus={!presets} />}
      </Field>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={loading} disabled={reason.trim().length < 5}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
