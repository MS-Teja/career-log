import { forwardRef, useId, useMemo, useState } from 'react';
import { Check, ChevronsUpDown, Plus } from 'lucide-react';
import type { Company } from '@career-log/shared';
import { errorMessage } from '@/api/client';
import { useCompanies, useCreateCompany } from '@/api/hooks';
import { cn } from '@/lib/utils';
import { useToast } from './ui/Toast';

/** Searchable company combobox. Matches names and aliases; can add a missing company for admin review. */
export const CompanyPicker = forwardRef<
  HTMLInputElement,
  { id: string; value: string; onChange: (id: string) => void; onBlur?: () => void; invalid?: boolean; describedBy?: string }
>(function CompanyPicker({ id, value, onChange, onBlur, invalid, describedBy }, ref) {
  const { data: companies = [], isLoading } = useCompanies();
  const create = useCreateCompany();
  const toast = useToast();
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  const selected = companies.find((c) => c._id === value);
  const q = query.trim().toLowerCase();
  const matches = useMemo(
    () => (q ? companies.filter((c) => c.name.toLowerCase().includes(q) || c.aliases.some((a) => a.includes(q))) : companies).slice(0, 8),
    [companies, q],
  );
  const exact = companies.some((c) => c.name.toLowerCase() === q || c.aliases.includes(q));
  const canAdd = q.length > 1 && !exact;
  const options: (Company | 'add')[] = [...matches, ...(canAdd ? (['add'] as const) : [])];

  const choose = (opt: Company | 'add' | undefined) => {
    if (!opt) return;
    if (opt === 'add') {
      create.mutate(
        { name: query.trim() },
        {
          onSuccess: (c) => {
            onChange(c._id);
            toast(c.verified ? `Using ${c.name}` : `Added ${c.name}. The placement cell will verify it.`);
          },
          onError: (e) => toast(errorMessage(e), 'error'),
        },
      );
    } else {
      onChange(opt._id);
    }
    setOpen(false);
    setQuery('');
  };

  return (
    <div className="relative">
      <input
        ref={ref}
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && options[activeIndex] ? `${listId}-${activeIndex}` : undefined}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        autoComplete="off"
        disabled={isLoading || create.isPending}
        placeholder={isLoading ? 'Loading…' : 'Search companies'}
        value={open ? query : (selected?.name ?? '')}
        onFocus={() => {
          setOpen(true);
          setActiveIndex(0);
        }}
        onBlur={() => {
          setOpen(false);
          setQuery('');
          onBlur?.();
        }}
        onChange={(e) => {
          setQuery(e.target.value);
          setActiveIndex(0);
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setOpen(true);
            setActiveIndex((i) => Math.min(i + 1, options.length - 1));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIndex((i) => Math.max(i - 1, 0));
          } else if (e.key === 'Enter' && open) {
            e.preventDefault();
            choose(options[activeIndex]);
          } else if (e.key === 'Escape') {
            setOpen(false);
          }
        }}
        className="h-10 w-full rounded-lg border border-border-strong/60 bg-surface px-3 pr-9 text-sm text-ink placeholder:text-muted hover:border-border-strong focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25 aria-[invalid=true]:border-danger"
      />
      <ChevronsUpDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
      {open && options.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-30 mt-1 max-h-72 w-full overflow-auto rounded-lg border border-border bg-surface p-1 shadow-lg"
        >
          {options.map((opt, i) => (
            <li
              key={opt === 'add' ? 'add' : opt._id}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={opt !== 'add' && opt._id === value}
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setActiveIndex(i)}
              onClick={() => choose(opt)}
              className={cn('flex min-h-10 cursor-pointer items-center gap-2 rounded-md px-3 text-sm', i === activeIndex && 'bg-surface-2')}
            >
              {opt === 'add' ? (
                <>
                  <Plus className="h-4 w-4 text-accent" aria-hidden />
                  <span>
                    Add <span className="font-medium">“{query.trim()}”</span> as a new company
                  </span>
                </>
              ) : (
                <>
                  <Check className={cn('h-4 w-4 text-accent', opt._id !== value && 'invisible')} aria-hidden />
                  <span className="flex-1">{opt.name}</span>
                  {q && opt.aliases.some((a) => a.includes(q)) && !opt.name.toLowerCase().includes(q) && (
                    <span className="meta">alias: {opt.aliases.find((a) => a.includes(q))}</span>
                  )}
                  {!opt.verified && <span className="meta">unverified</span>}
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
});
