import { useState } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';
import { Check } from 'lucide-react';
import type { PublicUser } from '@career-log/shared';
import { errorMessage } from '@/api/client';
import { useDecideSenior } from '@/api/hooks';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { timeAgo } from '@/lib/utils';
import { ReasonForm } from '../ExperienceDetail';

const DENY_PRESETS = [
  "We couldn't find you in this year's placement records. Reply to the placement cell with your offer details.",
  'Please add which company and drive you interviewed in.',
];

export function SeniorRequestsTab({ query }: { query: UseQueryResult<PublicUser[]> }) {
  const decide = useDecideSenior();
  const toast = useToast();
  const [denying, setDenying] = useState<PublicUser | null>(null);
  const [reason, setReason] = useState('');

  if (query.error) return <ErrorState error={query.error} onRetry={query.refetch} />;
  if (query.isLoading) return <Skeleton className="h-32" />;
  if (!query.data?.length)
    return <EmptyState title="No pending requests" description="Juniors who ask to post experiences will appear here." />;

  return (
    <>
      <ul className="space-y-2">
        {query.data.map((u) => (
          <li key={u._id} className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4 sm:flex-row sm:items-start">
            <div className="min-w-0 flex-1">
              <p className="font-medium">
                {u.name}{' '}
                <span className="meta">
                  · {u.branch} {u.gradYear}
                </span>
              </p>
              <p className="text-sm text-muted">{u.email}</p>
              {u.seniorRequest?.note && <p className="mt-2 text-sm italic text-ink/85">“{u.seniorRequest.note}”</p>}
              {u.seniorRequest?.requestedAt && <p className="meta mt-1">Requested {timeAgo(u.seniorRequest.requestedAt)}</p>}
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => setDenying(u)}>
                Decline
              </Button>
              <Button
                size="sm"
                loading={decide.isPending && decide.variables?.id === u._id}
                onClick={() =>
                  decide.mutate(
                    { id: u._id, action: 'approve' },
                    { onSuccess: () => toast(`${u.name} can now share experiences`), onError: (e) => toast(errorMessage(e), 'error') },
                  )
                }
              >
                <Check className="h-4 w-4" aria-hidden /> Approve
              </Button>
            </div>
          </li>
        ))}
      </ul>
      <Dialog
        open={!!denying}
        onClose={() => setDenying(null)}
        title={`Decline ${denying?.name ?? ''}`}
        description="They'll see this note and can request again."
      >
        <ReasonForm
          label="Note"
          presets={DENY_PRESETS}
          reason={reason}
          setReason={setReason}
          submitLabel="Decline request"
          loading={decide.isPending}
          onCancel={() => setDenying(null)}
          onSubmit={() =>
            decide.mutate(
              { id: denying!._id, action: 'deny', reason },
              {
                onSuccess: () => {
                  toast('Request declined');
                  setDenying(null);
                  setReason('');
                },
                onError: (e) => toast(errorMessage(e), 'error'),
              },
            )
          }
        />
      </Dialog>
    </>
  );
}
