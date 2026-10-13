import { useEffect, useRef, useState } from 'react';
import { Controller, FormProvider, useFieldArray, useForm, useWatch, type FieldErrors, type FieldPath } from 'react-hook-form';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { Check, ChevronLeft, ChevronRight, ChevronsDownUp, Plus, X } from 'lucide-react';
import {
  experienceSchema,
  OFFER_TYPE_LABELS,
  OFFER_TYPES,
  OVERALL_RESULTS,
  type Experience,
  type ExperienceInput,
  type RoundInput,
} from '@career-log/shared';
import { errorCode, errorMessage, tokenExpired } from '@/api/client';
import { useCompanies, useExperience, useSaveExperience } from '@/api/hooks';
import { CompanyPicker } from '@/components/CompanyPicker';
import { ErrorState } from '@/components/ErrorState';
import { ExperienceArticle } from '@/components/ExperienceArticle';
import { PageHeader } from '@/components/PageHeader';
import { emptyRound, RoundEditor } from '@/components/RoundEditor';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select, Textarea } from '@/components/ui/Form';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/context/AuthContext';
import { cn, storage, timeAgo } from '@/lib/utils';

const STEPS = ['The offer', 'Rounds', 'Advice', 'Review'] as const;
const STEP_FIELDS: FieldPath<ExperienceInput>[][] = [
  ['companyId', 'role', 'year', 'ctcRange', 'offerType', 'overallResult'],
  ['rounds'],
  ['tips', 'isAnonymous'],
];
const RESULT_LABELS = { selected: 'Selected', rejected: 'Not selected', waitlisted: 'Waitlisted', awaiting: 'Awaiting result' };

const defaults = (): ExperienceInput =>
  ({
    companyId: '',
    role: '',
    year: new Date().getFullYear(),
    ctcRange: '',
    offerType: 'full-time',
    overallResult: '',
    isAnonymous: false,
    tips: '',
    rounds: [emptyRound('online-assessment')],
  }) as unknown as ExperienceInput;

function fromExperience(exp: Experience): ExperienceInput {
  return {
    companyId: exp.company,
    role: exp.role,
    year: exp.year,
    ctcRange: exp.ctcRange ?? '',
    offerType: exp.offerType,
    overallResult: exp.overallResult,
    isAnonymous: exp.isAnonymous,
    tips: exp.tips ?? '',
    rounds: exp.rounds.map(({ type, difficulty, durationMins, result, description, questions }) => ({
      type,
      difficulty,
      durationMins,
      result,
      description: description ?? '',
      questions: questions.map(({ summary, topics, difficulty, approach }) => ({ summary, topics, difficulty, approach: approach ?? '' })),
    })),
  };
}

interface Draft {
  savedAt: number;
  values: ExperienceInput;
}

/** Drafts are per user and per post, so a shared computer never leaks one senior's draft to another. */
const draftKey = (userId: string, id?: string) => `cl_draft:${userId}:${id ?? 'new'}`;
function loadDraft(key: string): Draft | null {
  try {
    const raw = storage.get(key);
    return raw ? (JSON.parse(raw) as Draft) : null;
  } catch {
    return null;
  }
}

export default function Submit() {
  const { id } = useParams();
  const { user } = useAuth();
  const existing = useExperience(id);
  if (id && existing.isLoading)
    return (
      <div className="container-page space-y-4 py-10">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-64" />
      </div>
    );
  if (id && (existing.error || !existing.data))
    return (
      <div className="container-page py-10">
        <ErrorState error={existing.error} />
      </div>
    );
  if (!user) return null;

  return <SubmitForm key={id ?? 'new'} id={id} userId={user._id} existing={existing.data} />;
}

function SubmitForm({ id, userId, existing }: { id?: string; userId: string; existing?: Experience }) {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const save = useSaveExperience(id);
  const key = draftKey(userId, id);
  const [step, setStep] = useState(0);
  const stepHeading = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);

  // Restore a draft only if it's newer than the server copy.
  const [restored, setRestored] = useState<Draft | null>(() => {
    const d = loadDraft(key);
    if (!d) return null;
    if (existing && d.savedAt < new Date(existing.updatedAt).getTime()) return null;
    return d;
  });
  const initial = () => (existing ? fromExperience(existing) : defaults());

  const form = useForm<ExperienceInput>({
    resolver: zodResolver(experienceSchema),
    defaultValues: restored?.values ?? initial(),
    mode: 'onTouched',
  });
  const { register, control, handleSubmit, trigger, watch, reset, getValues, formState } = form;
  const { errors } = formState;
  const rounds = useFieldArray({ control, name: 'rounds' });
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  // Debounced autosave of every change (new posts and edits).
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const sub = watch((values) => {
      clearTimeout(t);
      t = setTimeout(() => storage.set(key, JSON.stringify({ savedAt: Date.now(), values })), 600);
    });
    return () => {
      clearTimeout(t);
      sub.unsubscribe();
    };
  }, [key, watch]);

  // Move focus to the step heading so screen readers announce the new step.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    window.scrollTo({ top: 0 });
    stepHeading.current?.focus();
  }, [step]);

  const next = async () => {
    const fields = STEP_FIELDS[step];
    if (fields && !(await trigger(fields, { shouldFocus: true }))) {
      if (step === 1) setCollapsed(new Set()); // reveal rounds with errors
      toast('Fix the highlighted fields first', 'error');
      return;
    }
    setStep((s) => s + 1);
  };

  const onInvalid = (errs: FieldErrors<ExperienceInput>) => {
    const target = STEP_FIELDS.findIndex((fields) => fields.some((f) => f.split('.')[0]! in errs));
    if (target >= 0) {
      setStep(target);
      setCollapsed(new Set());
      setTimeout(() => trigger(STEP_FIELDS[target], { shouldFocus: true }), 0);
    }
    toast('Some fields need attention', 'error');
  };

  const onSubmit = handleSubmit((values) => {
    if (tokenExpired()) {
      toast('Your session expired. Sign in again; your draft is saved.', 'error');
      navigate('/login', { state: { from: location.pathname } });
      return;
    }
    save.mutate(
      { ...values, expectedUpdatedAt: existing?.updatedAt },
      {
        onSuccess: (saved) => {
          storage.set(key, null);
          toast(id ? 'Updated and sent for review' : 'Submitted! An admin will review it shortly.');
          navigate(`/experiences/${saved._id}`);
        },
        onError: (e) => toast(errorMessage(e), 'error', errorCode(e) === 'EDIT_CONFLICT' ? { duration: 10_000 } : undefined),
      },
    );
  }, onInvalid);

  const removeRound = (i: number) => {
    const removed = getValues(`rounds.${i}`);
    rounds.remove(i);
    toast(`Round ${i + 1} removed`, 'success', { action: { label: 'Undo', onClick: () => rounds.insert(i, removed) } });
  };

  const allCollapsed = rounds.fields.length > 0 && rounds.fields.every((f) => collapsed.has(f.id));

  return (
    <div className="container-page pb-20">
      <PageHeader
        title={id ? 'Edit your experience' : 'Share your interview experience'}
        description="Structured entries power the topic analytics juniors rely on. It takes about five minutes."
      />

      {existing?.rejectionReason && (
        <div className="mb-6 rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm">
          <span className="font-medium">The placement cell asked for changes:</span> {existing.rejectionReason}
        </div>
      )}
      {restored && (
        <div
          className="mb-6 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-border bg-surface-2 py-2 pl-4 pr-2 text-sm"
          role="status"
        >
          <span>Restored your unsaved draft from {timeAgo(new Date(restored.savedAt).toISOString())}.</span>
          <button
            className="min-h-9 font-medium text-accent hover:underline"
            onClick={() => {
              storage.set(key, null);
              reset(initial());
              setRestored(null);
            }}
          >
            Discard draft
          </button>
          <button onClick={() => setRestored(null)} className="ml-auto rounded-md p-2 text-muted hover:text-ink" aria-label="Dismiss">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <nav aria-label="Progress">
        <ol className="mb-8 flex items-center gap-2 text-sm">
          {STEPS.map((label, i) => (
            <li key={label} className="flex items-center gap-2" aria-current={i === step ? 'step' : undefined}>
              {i > 0 && <span className="h-px w-4 bg-border sm:w-8" aria-hidden />}
              <button
                type="button"
                onClick={() => i < step && setStep(i)}
                disabled={i >= step}
                className="flex items-center gap-2 rounded-md disabled:cursor-default"
                aria-label={`Step ${i + 1}: ${label}${i < step ? ' (completed)' : ''}`}
              >
                <span
                  className={cn(
                    'flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold',
                    i < step
                      ? 'bg-accent text-accent-fg'
                      : i === step
                        ? 'border-2 border-accent text-accent'
                        : 'border border-border-strong/60 text-muted',
                  )}
                >
                  {i < step ? <Check className="h-3.5 w-3.5" aria-hidden /> : i + 1}
                </span>
                <span className={cn('hidden sm:inline', i === step ? 'font-medium text-ink' : 'text-muted')}>{label}</span>
              </button>
            </li>
          ))}
        </ol>
      </nav>

      <h2 ref={stepHeading} tabIndex={-1} className="mb-4 text-lg font-semibold focus:outline-none">
        {STEPS[step]}
      </h2>

      <FormProvider {...form}>
        <form onSubmit={(e) => e.preventDefault()} noValidate>
          {step === 0 && (
            <div className="max-w-2xl space-y-5 rounded-lg border border-border bg-surface p-5">
              <Field label="Company" error={errors.companyId?.message} hint="Type to search. Aliases work too (e.g. “AWS”).">
                {(fid) => (
                  <Controller
                    control={control}
                    name="companyId"
                    render={({ field }) => (
                      <CompanyPicker
                        ref={field.ref}
                        id={fid}
                        value={field.value}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        invalid={!!errors.companyId}
                      />
                    )}
                  />
                )}
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Role" error={errors.role?.message}>
                  {(fid) => <Input id={fid} placeholder="SDE-1, Analyst…" {...register('role')} />}
                </Field>
                <Field label="Year of interview" error={errors.year?.message}>
                  {(fid) => <Input id={fid} type="number" inputMode="numeric" {...register('year', { valueAsNumber: true })} />}
                </Field>
                <Field label="Offer type">
                  {(fid) => (
                    <Select id={fid} {...register('offerType')}>
                      {OFFER_TYPES.map((o) => (
                        <option key={o} value={o}>
                          {OFFER_TYPE_LABELS[o]}
                        </option>
                      ))}
                    </Select>
                  )}
                </Field>
                <Field label="CTC / stipend (optional)" hint="A range is fine, e.g. 18–22 LPA" error={errors.ctcRange?.message}>
                  {(fid) => <Input id={fid} placeholder="18–22 LPA" {...register('ctcRange')} />}
                </Field>
              </div>
              <Field label="Final result" error={errors.overallResult ? 'Pick the final result' : undefined}>
                {(fid) => (
                  <Select id={fid} {...register('overallResult')}>
                    <option value="" disabled>
                      Select…
                    </option>
                    {OVERALL_RESULTS.map((r) => (
                      <option key={r} value={r}>
                        {RESULT_LABELS[r]}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
            </div>
          )}

          {step === 1 && (
            <div className="max-w-3xl space-y-3">
              <div className="flex items-center justify-between gap-2">
                {typeof errors.rounds?.message === 'string' ? <p className="text-sm text-danger">{errors.rounds.message}</p> : <span />}
                {rounds.fields.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCollapsed(allCollapsed ? new Set() : new Set(rounds.fields.map((f) => f.id)))}
                  >
                    <ChevronsDownUp className="h-4 w-4" aria-hidden /> {allCollapsed ? 'Expand all' : 'Collapse all'}
                  </Button>
                )}
              </div>
              {rounds.fields.map((r, i) => (
                <RoundEditor
                  key={r.id}
                  index={i}
                  total={rounds.fields.length}
                  collapsed={collapsed.has(r.id)}
                  onToggle={() =>
                    setCollapsed((s) => {
                      const n = new Set(s);
                      if (n.has(r.id)) n.delete(r.id);
                      else n.add(r.id);
                      return n;
                    })
                  }
                  onRemove={() => removeRound(i)}
                  onDuplicate={() => rounds.insert(i + 1, structuredClone(getValues(`rounds.${i}`)) as RoundInput)}
                  onMove={(to) => rounds.move(i, to)}
                />
              ))}
              <Button variant="secondary" onClick={() => rounds.append(emptyRound())} disabled={rounds.fields.length >= 10}>
                <Plus className="h-4 w-4" /> Add round
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="max-w-2xl space-y-5">
              <Field
                label="Advice for juniors"
                hint="What would you tell yourself a month before? This is often the most-read part of a post."
              >
                {(fid) => (
                  <Textarea
                    id={fid}
                    rows={7}
                    placeholder="Topics to revise, mistakes to avoid, how the interviewers behaved…"
                    {...register('tips')}
                  />
                )}
              </Field>
              <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-surface p-4">
                <input type="checkbox" className="mt-1 h-4 w-4 accent-[rgb(var(--accent))]" {...register('isAnonymous')} />
                <span>
                  <span className="block text-sm font-medium">Post anonymously</span>
                  <span className="block text-[13px] text-muted">
                    Juniors won't see your name. The placement cell can still see it, which keeps entries genuine.
                  </span>
                </span>
              </label>
            </div>
          )}

          {step === 3 && <ReviewStep />}

          <div className="mt-8 flex items-center justify-between border-t border-border pt-5">
            <Button variant="ghost" onClick={() => setStep((s) => s - 1)} disabled={step === 0}>
              <ChevronLeft className="h-4 w-4" /> Back
            </Button>
            {step < STEPS.length - 1 ? (
              <Button onClick={next}>
                Continue <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={onSubmit} loading={save.isPending}>
                {id ? 'Save & resubmit' : 'Submit for review'}
              </Button>
            )}
          </div>
        </form>
      </FormProvider>
    </div>
  );
}

/** Subscribes to form values only while the preview is on screen, so typing elsewhere stays fast. */
function ReviewStep() {
  const values = useWatch<ExperienceInput>() as ExperienceInput;
  const { user } = useAuth();
  const { data: companies } = useCompanies();
  const companyName = companies?.find((c) => c._id === values.companyId)?.name ?? 'Company';
  const byline = values.isAnonymous
    ? 'Shared anonymously'
    : `${user?.name ?? ''}${user?.gradYear ? ` · ${user.branch ?? ''} ’${String(user.gradYear).slice(2)}` : ''}`;
  return (
    <div className="rounded-lg border border-border bg-bg px-4 py-8 sm:px-8">
      <p className="meta mb-6 text-center uppercase tracking-wider">Preview · this is how juniors will see it</p>
      <ExperienceArticle data={{ ...values, companyName, role: values.role || 'Role', byline }} />
      <p className="mx-auto mt-8 max-w-prose text-[13px] text-muted">
        The placement cell reviews every post before it goes live. You can edit it until then.
      </p>
    </div>
  );
}
