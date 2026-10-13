import type { ExperienceStatus, OverallResult, RoundResult } from '@career-log/shared';
import { Badge } from './ui/Badge';

const RESULT: Record<OverallResult | RoundResult, { label: string; tone: 'success' | 'danger' | 'warning' | 'neutral' }> = {
  selected: { label: 'Selected', tone: 'success' },
  rejected: { label: 'Not selected', tone: 'danger' },
  waitlisted: { label: 'Waitlisted', tone: 'warning' },
  awaiting: { label: 'Awaiting result', tone: 'neutral' },
  cleared: { label: 'Cleared', tone: 'success' },
  'not-cleared': { label: 'Not cleared', tone: 'danger' },
};

export function ResultBadge({ result, className }: { result: OverallResult | RoundResult; className?: string }) {
  const r = RESULT[result];
  return (
    <Badge tone={r.tone} className={className}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
      {r.label}
    </Badge>
  );
}

const STATUS: Record<ExperienceStatus, { label: string; tone: 'success' | 'danger' | 'warning' }> = {
  pending: { label: 'In review', tone: 'warning' },
  approved: { label: 'Published', tone: 'success' },
  rejected: { label: 'Changes requested', tone: 'danger' },
};

export function StatusBadge({ status }: { status: ExperienceStatus }) {
  return <Badge tone={STATUS[status].tone}>{STATUS[status].label}</Badge>;
}
