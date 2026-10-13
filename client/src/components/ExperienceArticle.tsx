import type { ReactNode } from 'react';
import { Clock } from 'lucide-react';
import {
  OFFER_TYPE_LABELS,
  ROUND_TYPE_LABELS,
  type Difficulty,
  type OfferType,
  type OverallResult,
  type RoundInput,
} from '@career-log/shared';
import { cn } from '@/lib/utils';
import { ResultBadge } from './ResultBadge';
import { TopicChip } from './TopicChip';

export interface ArticleData {
  companyName: string;
  role: string;
  year: number;
  ctcRange?: string;
  offerType: OfferType;
  overallResult: OverallResult;
  tips?: string;
  rounds: RoundInput[];
  byline: string;
  dateLabel?: string;
}

const DIFFICULTY_DOT: Record<Difficulty, string> = {
  easy: 'bg-success',
  medium: 'bg-warning',
  hard: 'bg-danger',
};

function DifficultyLabel({ d }: { d: Difficulty }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs capitalize text-muted">
      <span className={cn('h-1.5 w-1.5 rounded-full', DIFFICULTY_DOT[d])} aria-hidden />
      {d}
    </span>
  );
}

/** The "notebook" reading view of one experience. Used on the detail page and the submit preview. */
export function ExperienceArticle({ data, aside }: { data: ArticleData; aside?: ReactNode }) {
  return (
    <article className="mx-auto max-w-prose">
      <header className="border-b border-border pb-6">
        <p className="meta uppercase tracking-wider">
          {data.year} · {OFFER_TYPE_LABELS[data.offerType]}
          {data.ctcRange ? ` · ${data.ctcRange}` : ''}
        </p>
        <h1 className="mt-2 font-serif text-page font-medium sm:text-[40px] sm:leading-tight">
          {data.companyName}
          <span className="text-muted">, </span>
          <span className="italic text-ink/80">{data.role}</span>
        </h1>
        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2">
          <ResultBadge result={data.overallResult} />
          <span className="text-sm text-muted">
            {data.byline}
            {data.dateLabel && <> · {data.dateLabel}</>}
          </span>
        </div>
        {aside && <div className="mt-4">{aside}</div>}
      </header>

      <ol className="relative mt-8">
        {data.rounds.map((round, i) => {
          const last = i === data.rounds.length - 1;
          return (
            <li key={i} id={`round-${i + 1}`} className="relative scroll-mt-20 pb-10 pl-8 last:pb-2">
              {!last && <span className="absolute left-[7px] top-5 h-full w-px bg-border" aria-hidden />}
              <span
                className={cn(
                  'absolute left-0 top-1.5 h-[15px] w-[15px] rounded-full border-2 bg-bg',
                  round.result === 'cleared' ? 'border-success' : round.result === 'not-cleared' ? 'border-danger' : 'border-muted',
                )}
                aria-hidden
              />
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <h2 className="font-serif text-xl font-medium">
                  <span className="meta mr-2 align-middle">R{i + 1}</span>
                  {ROUND_TYPE_LABELS[round.type]}
                </h2>
                <div className="flex items-center gap-3">
                  <DifficultyLabel d={round.difficulty} />
                  {round.durationMins ? (
                    <span className="meta inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" aria-hidden />
                      {round.durationMins} min
                    </span>
                  ) : null}
                  <ResultBadge result={round.result} />
                </div>
              </div>

              {round.description && <p className="prose-notebook mt-2 text-ink/85">{round.description}</p>}

              {round.questions.length > 0 && (
                <ul className="mt-4 space-y-4">
                  {round.questions.map((q, j) => (
                    <li key={j} className="rounded-lg border border-border bg-surface px-4 py-3">
                      <p className="prose-notebook text-[16px]">{q.summary}</p>
                      {q.approach && (
                        <p className="mt-2 whitespace-pre-line border-l-2 border-accent/40 pl-3 text-sm text-muted">
                          <span className="font-medium text-ink/80">Approach: </span>
                          {q.approach}
                        </p>
                      )}
                      <div className="mt-3 flex flex-wrap items-center gap-1.5">
                        {q.topics.map((t) => (
                          <TopicChip key={t} topic={t} size="xs" href={`/browse?topic=${t}`} />
                        ))}
                        {q.difficulty && (
                          <span className="ml-auto">
                            <DifficultyLabel d={q.difficulty} />
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ol>

      {data.tips && (
        <aside className="mt-10 border-l-[3px] border-accent py-1 pl-5">
          <p className="meta mb-2 uppercase tracking-wider">Advice for juniors</p>
          <blockquote className="prose-notebook whitespace-pre-line text-[19px] italic leading-relaxed">“{data.tips}”</blockquote>
        </aside>
      )}
    </article>
  );
}
