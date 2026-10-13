import { useState } from 'react';
import { BadgeCheck, GitMerge, Pencil, Plus, Trash2 } from 'lucide-react';
import type { Company } from '@career-log/shared';
import { errorMessage } from '@/api/client';
import { useCompanies, useDeleteCompany, useMergeCompany, useSaveCompany } from '@/api/hooks';
import { ErrorState } from '@/components/ErrorState';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog, Dialog } from '@/components/ui/Dialog';
import { Field, Input, Select } from '@/components/ui/Form';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';

export function CompaniesTab() {
  const { data, isLoading, error, refetch } = useCompanies();
  const del = useDeleteCompany();
  const save = useSaveCompany();
  const toast = useToast();
  const [editing, setEditing] = useState<Company | 'new' | null>(null);
  const [merging, setMerging] = useState<Company | null>(null);
  const [deleting, setDeleting] = useState<Company | null>(null);

  if (error) return <ErrorState error={error} onRetry={refetch} />;
  // Unverified companies (added by seniors) first, so they get reviewed.
  const rows = [...(data ?? [])].sort((a, b) => Number(a.verified) - Number(b.verified) || a.name.localeCompare(b.name));
  const unverified = rows.filter((c) => !c.verified).length;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          {unverified > 0 ? `${unverified} new compan${unverified === 1 ? 'y' : 'ies'} added by seniors need a look. ` : ''}
          Aliases let different spellings (“Amazon India”, “AWS”) resolve to one company.
        </p>
        <Button size="sm" onClick={() => setEditing('new')}>
          <Plus className="h-4 w-4" aria-hidden /> Add company
        </Button>
      </div>
      <div className="overflow-x-auto rounded-lg border border-border bg-surface">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left text-[13px] text-muted">
            <tr>
              <th className="px-4 py-2.5 font-medium">Name</th>
              <th className="px-4 py-2.5 font-medium">Aliases</th>
              <th className="px-4 py-2.5 text-right font-medium">Experiences</th>
              <th className="px-4 py-2.5">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading
              ? [0, 1, 2].map((i) => (
                  <tr key={i}>
                    <td colSpan={4} className="px-4 py-3">
                      <Skeleton className="h-5" />
                    </td>
                  </tr>
                ))
              : rows.map((c) => (
                  <tr key={c._id} className={c.verified ? undefined : 'bg-warning/5'}>
                    <td className="px-4 py-2 font-medium">
                      {c.name} {!c.verified && <Badge tone="warning">New</Badge>}
                    </td>
                    <td className="px-4 py-2 text-muted">{c.aliases.join(', ') || '—'}</td>
                    <td className="meta px-4 py-2 text-right">{c.experienceCount}</td>
                    <td className="whitespace-nowrap px-2 py-1 text-right">
                      {!c.verified && (
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Verify ${c.name}`}
                          title="Verify"
                          onClick={() =>
                            save.mutate(
                              { id: c._id, name: c.name, aliases: c.aliases, website: c.website ?? '', verified: true },
                              { onSuccess: () => toast(`${c.name} verified`), onError: (e) => toast(errorMessage(e), 'error') },
                            )
                          }
                        >
                          <BadgeCheck className="h-4 w-4 text-success" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Merge ${c.name} into another company`}
                        title="Merge"
                        onClick={() => setMerging(c)}
                      >
                        <GitMerge className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" aria-label={`Edit ${c.name}`} title="Edit" onClick={() => setEditing(c)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="danger-ghost"
                        size="icon"
                        aria-label={`Delete ${c.name}`}
                        title="Delete"
                        onClick={() => setDeleting(c)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
      {editing && <CompanyDialog company={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
      {merging && <MergeDialog company={merging} companies={rows} onClose={() => setMerging(null)} />}
      <ConfirmDialog
        open={!!deleting}
        title={`Delete ${deleting?.name ?? ''}?`}
        description={
          deleting?.experienceCount
            ? 'It still has experiences. Merge it into another company instead.'
            : 'This removes it from the company list.'
        }
        confirmLabel="Delete"
        danger
        loading={del.isPending}
        onClose={() => setDeleting(null)}
        onConfirm={() =>
          del.mutate(deleting!._id, {
            onSuccess: () => {
              toast('Company deleted');
              setDeleting(null);
            },
            onError: (e) => toast(errorMessage(e), 'error'),
          })
        }
      />
    </div>
  );
}

function MergeDialog({ company, companies, onClose }: { company: Company; companies: Company[]; onClose: () => void }) {
  const merge = useMergeCompany();
  const toast = useToast();
  const [intoId, setIntoId] = useState('');
  return (
    <Dialog
      open
      onClose={onClose}
      title={`Merge ${company.name}`}
      description={`Moves its ${company.experienceCount ?? 0} experience(s) to the company you pick and keeps “${company.name}” as an alias.`}
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          merge.mutate(
            { id: company._id, intoId },
            {
              onSuccess: (r) => {
                toast(`Merged into ${r.company.name} (${r.moved} moved)`);
                onClose();
              },
              onError: (err) => toast(errorMessage(err), 'error'),
            },
          );
        }}
      >
        <Field label="Merge into">
          {(id) => (
            <Select id={id} value={intoId} onChange={(e) => setIntoId(e.target.value)} autoFocus>
              <option value="">Select a company</option>
              {companies
                .filter((c) => c._id !== company._id)
                .map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
            </Select>
          )}
        </Field>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={merge.isPending} disabled={!intoId}>
            Merge
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function CompanyDialog({ company, onClose }: { company: Company | null; onClose: () => void }) {
  const save = useSaveCompany();
  const toast = useToast();
  const [name, setName] = useState(company?.name ?? '');
  const [aliases, setAliases] = useState(company?.aliases.join(', ') ?? '');
  const [website, setWebsite] = useState(company?.website ?? '');

  return (
    <Dialog open onClose={onClose} title={company ? `Edit ${company.name}` : 'Add company'}>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate(
            {
              id: company?._id,
              name: name.trim(),
              aliases: aliases
                .split(',')
                .map((a) => a.trim())
                .filter(Boolean),
              website: website.trim(),
              verified: true,
            },
            {
              onSuccess: (c) => {
                toast(!company && c.name.toLowerCase() !== name.trim().toLowerCase() ? `${c.name} already exists` : 'Saved');
                onClose();
              },
              onError: (err) => toast(errorMessage(err), 'error'),
            },
          );
        }}
      >
        <Field label="Name">{(id) => <Input id={id} value={name} onChange={(e) => setName(e.target.value)} autoFocus />}</Field>
        <Field label="Aliases" hint="Comma-separated">
          {(id) => <Input id={id} value={aliases} onChange={(e) => setAliases(e.target.value)} placeholder="amazon india, aws" />}
        </Field>
        <Field label="Website (optional)">
          {(id) => <Input id={id} value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://" />}
        </Field>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={save.isPending} disabled={!name.trim()}>
            Save
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
