import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { ROLES, type PublicUser, type Role } from '@career-log/shared';
import { errorMessage } from '@/api/client';
import { useAdminUsers, useUpdateRole } from '@/api/hooks';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { Badge } from '@/components/ui/Badge';
import { ConfirmDialog } from '@/components/ui/Dialog';
import { Input, Select } from '@/components/ui/Form';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/context/AuthContext';

const cap = (s: string) => s[0]!.toUpperCase() + s.slice(1);

export function UsersTab() {
  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);
  const { data, isLoading, isFetching, error, refetch } = useAdminUsers(debounced);
  const update = useUpdateRole();
  const toast = useToast();
  const { user: me } = useAuth();
  const [pending, setPending] = useState<{ user: PublicUser; role: Role } | null>(null);

  if (error) return <ErrorState error={error} onRetry={refetch} />;

  return (
    <div>
      <div className="relative mb-4 max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
        <Input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name or email"
          className="pl-9"
          aria-label="Search users"
        />
      </div>
      {isLoading ? (
        <Skeleton className="h-48" />
      ) : !data?.length ? (
        <EmptyState title="No users found" />
      ) : (
        <div className={`overflow-x-auto rounded-lg border border-border bg-surface transition-opacity ${isFetching ? 'opacity-60' : ''}`}>
          <table className="w-full text-sm">
            <thead className="border-b border-border text-left text-[13px] text-muted">
              <tr>
                <th className="px-4 py-2.5 font-medium">Name</th>
                <th className="px-4 py-2.5 font-medium">Email</th>
                <th className="px-4 py-2.5 font-medium">Batch</th>
                <th className="px-4 py-2.5 font-medium">Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.map((u) => (
                <tr key={u._id}>
                  <td className="px-4 py-2 font-medium">
                    {u.name} {!u.isVerified && <Badge tone="warning">Unverified</Badge>}
                    {u.seniorRequest?.status === 'pending' && <Badge tone="accent">Requested senior</Badge>}
                  </td>
                  <td className="px-4 py-2 text-muted">{u.email}</td>
                  <td className="meta px-4 py-2">
                    {u.branch ?? '—'} {u.gradYear ?? ''}
                  </td>
                  <td className="px-4 py-1.5">
                    <Select
                      aria-label={`Role for ${u.name}`}
                      className="h-9 w-32 text-[13px]"
                      value={u.role}
                      disabled={u._id === me?._id || (update.isPending && update.variables?.id === u._id)}
                      onChange={(e) => setPending({ user: u, role: e.target.value as Role })}
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {cap(r)}
                        </option>
                      ))}
                    </Select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <ConfirmDialog
        open={!!pending}
        title={pending ? `Make ${pending.user.name} ${pending.role === 'admin' ? 'an admin' : `a ${pending.role}`}?` : ''}
        description={
          pending?.role === 'admin'
            ? 'Admins can approve posts, manage companies and change anyone’s role.'
            : pending?.role === 'senior'
              ? 'Seniors can share interview experiences.'
              : 'Juniors can browse but not post.'
        }
        confirmLabel="Change role"
        danger={pending?.role === 'admin'}
        loading={update.isPending}
        onClose={() => setPending(null)}
        onConfirm={() =>
          update.mutate(
            { id: pending!.user._id, role: pending!.role },
            {
              onSuccess: () => {
                toast(`${pending!.user.name} is now ${pending!.role}`);
                setPending(null);
              },
              onError: (err) => toast(errorMessage(err), 'error'),
            },
          )
        }
      />
    </div>
  );
}
