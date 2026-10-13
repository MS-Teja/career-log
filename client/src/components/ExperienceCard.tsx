import { Link } from 'react-router-dom';
import { OFFER_TYPE_LABELS, type Experience } from '@career-log/shared';
import { MessageSquareWarning } from 'lucide-react';
import { ExperienceActions } from './ExperienceActions';
import { ResultBadge, StatusBadge } from './ResultBadge';
import { RoundSequence } from './RoundSequence';
import { TopicChip } from './TopicChip';

export function uniqueTopics(exp: Pick<Experience, 'rounds'>) {
  const counts = new Map<string, number>();
  for (const r of exp.rounds) for (const q of r.questions) for (const t of q.topics) counts.set(t, (counts.get(t) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([t]) => t);
}

export function authorLine(exp: Experience) {
  if (!exp.author) return 'Shared anonymously';
  const batch = exp.author.gradYear ? ` · ${exp.author.branch ?? ''} ’${String(exp.author.gradYear).slice(2)}` : '';
  return `${exp.author.name}${batch}${exp.isAnonymous ? ' (anonymous to others)' : ''}`;
}

export function ExperienceCard({
  exp,
  showStatus,
  showNote,
  actions = true,
}: {
  exp: Experience;
  showStatus?: boolean;
  /** Show the admin's change request inline (My posts). */
  showNote?: boolean;
  actions?: boolean;
}) {
  const topics = uniqueTopics(exp);
  return (
    <article className="group relative flex flex-col rounded-lg border border-border bg-surface p-4 transition-colors focus-within:ring-2 focus-within:ring-accent hover:border-border-strong">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-card font-semibold">
            <Link
              to={`/experiences/${exp._id}`}
              aria-label={`${exp.companyName}, ${exp.role}, ${exp.year}`}
              className="after:absolute after:inset-0 after:content-[''] focus:outline-none"
            >
              {exp.companyName}
            </Link>
          </h3>
          <p className="truncate text-sm text-ink/80">{exp.role}</p>
        </div>
        {showStatus ? <StatusBadge status={exp.status} /> : <ResultBadge result={exp.overallResult} />}
      </div>

      <div className="meta mt-2 flex flex-wrap gap-x-2">
        <span>{exp.year}</span>
        <span aria-hidden>·</span>
        <span>{OFFER_TYPE_LABELS[exp.offerType]}</span>
        {exp.ctcRange && (
          <>
            <span aria-hidden>·</span>
            <span>{exp.ctcRange}</span>
          </>
        )}
        <span aria-hidden>·</span>
        <span>
          {exp.rounds.length} round{exp.rounds.length === 1 ? '' : 's'}
        </span>
      </div>

      <RoundSequence types={exp.rounds.map((r) => r.type)} className="mt-3" />

      {topics.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {topics.slice(0, 4).map((t) => (
            <TopicChip key={t} topic={t} size="xs" />
          ))}
          {topics.length > 4 && <span className="meta self-center">+{topics.length - 4}</span>}
        </div>
      )}

      {showNote && exp.status === 'rejected' && exp.rejectionReason && (
        <p className="mt-3 flex gap-2 rounded-md bg-danger/5 px-3 py-2 text-[13px] text-ink">
          <MessageSquareWarning className="mt-0.5 h-3.5 w-3.5 shrink-0 text-danger" aria-hidden />
          <span>
            <span className="font-medium">Admin note:</span> {exp.rejectionReason}
          </span>
        </p>
      )}

      <div className="mt-auto flex items-center justify-between gap-2 pt-3">
        <span className="truncate text-xs text-muted">{authorLine(exp)}</span>
        {actions && exp.status === 'approved' && <ExperienceActions exp={exp} className="relative z-10 -my-1 -mr-2" />}
      </div>
    </article>
  );
}

export function ExperienceCardSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="h-5 w-1/2 animate-pulse rounded bg-surface-2" />
      <div className="mt-2 h-4 w-1/3 animate-pulse rounded bg-surface-2" />
      <div className="mt-4 h-3 w-2/3 animate-pulse rounded bg-surface-2" />
      <div className="mt-4 flex gap-1.5">
        <div className="h-5 w-16 animate-pulse rounded-full bg-surface-2" />
        <div className="h-5 w-20 animate-pulse rounded-full bg-surface-2" />
      </div>
    </div>
  );
}
