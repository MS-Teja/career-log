import { Controller, useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import { ArrowDown, ArrowUp, ChevronDown, Copy, Plus, Trash2 } from 'lucide-react';
import {
  DIFFICULTIES,
  ROUND_RESULTS,
  ROUND_TYPE_LABELS,
  ROUND_TYPES,
  type ExperienceInput,
  type RoundInput,
  type RoundType,
} from '@career-log/shared';
import { cn } from '@/lib/utils';
import { TopicPicker } from './TopicPicker';
import { Button } from './ui/Button';
import { Field, Input, Select, Textarea } from './ui/Form';

const RESULT_LABELS = { cleared: 'Cleared', 'not-cleared': 'Not cleared', awaiting: 'Awaiting result' };
const NON_TECHNICAL: RoundType[] = ['hr', 'group-discussion', 'managerial'];
const optionalNumber = (v: string) => (v === '' || v === null ? undefined : Number(v));
const optionalString = (v: string) => (v ? v : undefined);
const cap = (s: string) => s[0]!.toUpperCase() + s.slice(1);

export const emptyQuestion = () => ({ summary: '', topics: [], approach: '' });

/** Difficulty and result start unselected so defaults don't skew the analytics. */
export const emptyRound = (type: RoundType = 'coding'): RoundInput =>
  ({
    type,
    difficulty: '',
    result: '',
    description: '',
    questions: NON_TECHNICAL.includes(type) ? [] : [emptyQuestion()],
  }) as unknown as RoundInput;

export function RoundEditor({
  index,
  total,
  collapsed,
  onToggle,
  onRemove,
  onDuplicate,
  onMove,
}: {
  index: number;
  total: number;
  collapsed: boolean;
  onToggle: () => void;
  onRemove: () => void;
  onDuplicate: () => void;
  onMove: (to: number) => void;
}) {
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<ExperienceInput>();
  const questions = useFieldArray({ control, name: `rounds.${index}.questions` });
  const round = useWatch({ control, name: `rounds.${index}` });
  const roundErrors = errors.rounds?.[index];
  const hasErrors = !!roundErrors;
  const panelId = `round-panel-${index}`;

  const summary = [
    `${round?.questions?.length ?? 0} question${round?.questions?.length === 1 ? '' : 's'}`,
    round?.difficulty && cap(round.difficulty),
    round?.result && RESULT_LABELS[round.result],
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <section
      className={cn('rounded-lg border bg-surface', hasErrors ? 'border-danger/50' : 'border-border')}
      aria-labelledby={`${panelId}-title`}
    >
      <header className="flex items-center gap-1 border-b border-border py-1 pl-2 pr-1">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={!collapsed}
          aria-controls={panelId}
          className="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-md px-2 text-left hover:bg-surface-2"
        >
          <ChevronDown className={cn('h-4 w-4 shrink-0 text-muted transition-transform', collapsed && '-rotate-90')} aria-hidden />
          <span id={`${panelId}-title`} className="truncate font-semibold">
            <span className="meta mr-1.5">R{index + 1}</span>
            {ROUND_TYPE_LABELS[round?.type as RoundType] ?? 'Round'}
          </span>
          {collapsed && <span className="hidden truncate text-[13px] text-muted sm:inline">· {summary}</span>}
          {hasErrors && <span className="ml-auto shrink-0 text-xs font-medium text-danger">Needs attention</span>}
        </button>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Move round ${index + 1} up`}
          disabled={index === 0}
          onClick={() => onMove(index - 1)}
        >
          <ArrowUp className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Move round ${index + 1} down`}
          disabled={index === total - 1}
          onClick={() => onMove(index + 1)}
        >
          <ArrowDown className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" aria-label={`Duplicate round ${index + 1}`} onClick={onDuplicate} disabled={total >= 10}>
          <Copy className="h-4 w-4" />
        </Button>
        <Button variant="danger-ghost" size="icon" aria-label={`Remove round ${index + 1}`} disabled={total === 1} onClick={onRemove}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </header>

      <div id={panelId} hidden={collapsed} className="space-y-4 p-4">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Field label="Type" className="col-span-2 md:col-span-1" error={roundErrors?.type?.message}>
            {(id) => (
              <Select id={id} {...register(`rounds.${index}.type`)}>
                {ROUND_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {ROUND_TYPE_LABELS[t]}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Difficulty" error={roundErrors?.difficulty?.message}>
            {(id) => (
              <Select id={id} {...register(`rounds.${index}.difficulty`)}>
                <option value="" disabled>
                  Select…
                </option>
                {DIFFICULTIES.map((d) => (
                  <option key={d} value={d}>
                    {cap(d)}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Result" error={roundErrors?.result?.message}>
            {(id) => (
              <Select id={id} {...register(`rounds.${index}.result`)}>
                <option value="" disabled>
                  Select…
                </option>
                {ROUND_RESULTS.map((r) => (
                  <option key={r} value={r}>
                    {RESULT_LABELS[r]}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Duration (min)" error={roundErrors?.durationMins?.message}>
            {(id) => (
              <Input
                id={id}
                type="number"
                inputMode="numeric"
                min={0}
                placeholder="60"
                {...register(`rounds.${index}.durationMins`, { setValueAs: optionalNumber })}
              />
            )}
          </Field>
        </div>

        <Field label="About this round (optional)" hint="Platform, format, interviewer's style, anything notable.">
          {(id) => <Textarea id={id} rows={2} className="min-h-[64px]" {...register(`rounds.${index}.description`)} />}
        </Field>

        <div>
          <p className="mb-2 text-[13px] font-medium">Questions</p>
          {questions.fields.length === 0 && (
            <p className="mb-3 rounded-lg border border-dashed border-border px-4 py-3 text-[13px] text-muted">
              No questions recorded. That's fine for HR, GD or managerial rounds; add any that stood out.
            </p>
          )}
          <div className="space-y-3">
            {questions.fields.map((q, qi) => {
              const qErr = roundErrors?.questions?.[qi];
              return (
                <div key={q.id} className="rounded-lg border border-border bg-surface-2/50 p-3">
                  <div className="flex items-start gap-2">
                    <span className="meta mt-2.5 w-6 shrink-0">Q{qi + 1}</span>
                    <div className="min-w-0 flex-1 space-y-3">
                      <Field
                        label="What was asked"
                        error={qErr?.summary?.message}
                        hint="Summarise it in your own words. Don't paste the exact test question (NDA)."
                      >
                        {(id) => (
                          <Textarea
                            id={id}
                            rows={2}
                            className="min-h-[60px] bg-surface"
                            placeholder="e.g. Find the longest path in a grid where each step must increase"
                            {...register(`rounds.${index}.questions.${qi}.summary`)}
                          />
                        )}
                      </Field>
                      <Controller
                        control={control}
                        name={`rounds.${index}.questions.${qi}.topics`}
                        render={({ field }) => (
                          <TopicPicker
                            ref={field.ref}
                            value={field.value}
                            onChange={field.onChange}
                            summary={round?.questions?.[qi]?.summary ?? ''}
                            roundType={round?.type}
                            invalid={!!qErr?.topics}
                          />
                        )}
                      />
                      {qErr?.topics?.message && (
                        <p className="text-[13px] text-danger" role="alert">
                          {qErr.topics.message}
                        </p>
                      )}
                      <div className="grid gap-3 sm:grid-cols-[1fr_160px]">
                        <Field label="Your approach (optional)">
                          {(id) => (
                            <Textarea
                              id={id}
                              rows={1}
                              className="min-h-10 bg-surface"
                              placeholder="e.g. DFS + memoisation"
                              {...register(`rounds.${index}.questions.${qi}.approach`)}
                            />
                          )}
                        </Field>
                        <Field label="Difficulty">
                          {(id) => (
                            <Select
                              id={id}
                              className="bg-surface"
                              {...register(`rounds.${index}.questions.${qi}.difficulty`, { setValueAs: optionalString })}
                            >
                              <option value="">—</option>
                              {DIFFICULTIES.map((d) => (
                                <option key={d} value={d}>
                                  {cap(d)}
                                </option>
                              ))}
                            </Select>
                          )}
                        </Field>
                      </div>
                    </div>
                    <Button
                      variant="danger-ghost"
                      size="icon"
                      aria-label={`Remove question ${qi + 1}`}
                      onClick={() => questions.remove(qi)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
          <Button
            variant="secondary"
            size="sm"
            className="mt-3"
            onClick={() => questions.append(emptyQuestion())}
            disabled={questions.fields.length >= 20}
          >
            <Plus className="h-4 w-4" /> Add question
          </Button>
        </div>
      </div>
    </section>
  );
}
