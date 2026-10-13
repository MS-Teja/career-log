import { useState } from 'react';
import { Clock, GraduationCap } from 'lucide-react';
import { seniorRequestSchema } from '@career-log/shared';
import { errorMessage } from '@/api/client';
import { useRequestSenior } from '@/api/hooks';
import { useAuth } from '@/context/AuthContext';
import { Button } from './ui/Button';
import { Field, Textarea } from './ui/Form';
import { useToast } from './ui/Toast';

/** Lets a junior ask the placement cell for permission to post experiences. */
export function RequestSeniorAccess({ compact }: { compact?: boolean }) {
  const { user } = useAuth();
  const request = useRequestSenior();
  const toast = useToast();
  const [note, setNote] = useState('');
  const [error, setError] = useState<string>();
  const status = user?.seniorRequest?.status ?? 'none';

  if (!user || user.role !== 'junior') return null;

  if (status === 'pending')
    return (
      <div className="flex gap-3 rounded-lg border border-border bg-surface p-4">
        <Clock className="mt-0.5 h-5 w-5 shrink-0 text-warning" aria-hidden />
        <div>
          <p className="font-medium">Your request is with the placement cell</p>
          <p className="mt-1 text-sm text-muted">We'll email you when it's approved, usually within a day or two.</p>
          {user.seniorRequest?.note && <p className="mt-2 text-sm italic text-ink/80">“{user.seniorRequest.note}”</p>}
        </div>
      </div>
    );

  return (
    <form
      className="space-y-4 rounded-lg border border-border bg-surface p-5"
      onSubmit={(e) => {
        e.preventDefault();
        const parsed = seniorRequestSchema.safeParse({ note });
        if (!parsed.success) {
          setError(parsed.error.issues[0]?.message);
          return;
        }
        setError(undefined);
        request.mutate(parsed.data.note, {
          onSuccess: () => toast('Request sent to the placement cell'),
          onError: (err) => toast(errorMessage(err), 'error'),
        });
      }}
    >
      <div className="flex gap-3">
        <GraduationCap className="mt-0.5 h-5 w-5 shrink-0 text-accent" aria-hidden />
        <div>
          <p className="font-medium">{compact ? 'Request senior access' : 'Been through placements? Share what you saw.'}</p>
          <p className="mt-1 text-sm text-muted">
            Only verified seniors can post, so every experience comes from someone who was actually interviewed. The placement cell reviews
            each request.
          </p>
          {status === 'denied' && user.seniorRequest?.reason && (
            <p className="mt-2 rounded-md bg-danger/5 px-3 py-2 text-sm">
              <span className="font-medium">Previous request declined:</span> {user.seniorRequest.reason}
            </p>
          )}
        </div>
      </div>
      <Field
        label="Where were you placed or interviewed?"
        error={error}
        hint="e.g. “Placed at Deloitte in the Sept 2025 drive; also interviewed at TCS.”"
      >
        {(id) => <Textarea id={id} rows={3} value={note} onChange={(e) => setNote(e.target.value)} />}
      </Field>
      <Button type="submit" loading={request.isPending}>
        Send request
      </Button>
    </form>
  );
}
