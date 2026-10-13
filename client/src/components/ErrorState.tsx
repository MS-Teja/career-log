import { errorMessage } from '@/api/client';
import { Button } from './ui/Button';

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <div className="rounded-lg border border-danger/30 bg-danger/5 px-5 py-6 text-center">
      <p className="text-sm text-ink">{errorMessage(error, 'Could not load this')}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" className="mt-3" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
