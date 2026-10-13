import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { changePasswordSchema, profileSchema, type ChangePasswordInput, type ProfileInput } from '@career-log/shared';
import { errorMessage } from '@/api/client';
import { useChangePassword, useDeleteAccount, useUpdateProfile } from '@/api/hooks';
import { PageHeader } from '@/components/PageHeader';
import { RequestSeniorAccess } from '@/components/RequestSeniorAccess';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { Dialog } from '@/components/ui/Dialog';
import { Field, Input } from '@/components/ui/Form';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/context/AuthContext';

export default function Settings() {
  const { user } = useAuth();
  if (!user) return null;
  return (
    <div className="container-page max-w-2xl space-y-6 pb-16">
      <PageHeader title="Settings" description={user.email} />
      <ProfileCard />
      {user.role === 'junior' ? (
        <section aria-label="Senior access">
          <RequestSeniorAccess compact />
        </section>
      ) : (
        <Card className="flex items-center justify-between gap-4 px-5 py-4">
          <div>
            <p className="font-medium">Role</p>
            <p className="text-sm text-muted">
              {user.role === 'admin' ? 'Placement cell admin' : 'Verified senior: you can share experiences.'}
            </p>
          </div>
          <Badge tone="accent" className="capitalize">
            {user.role}
          </Badge>
        </Card>
      )}
      <PasswordCard />
      <DangerCard />
    </div>
  );
}

function ProfileCard() {
  const { user } = useAuth();
  const update = useUpdateProfile();
  const toast = useToast();
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
  } = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user!.name, branch: user!.branch ?? '', gradYear: user!.gradYear },
  });
  return (
    <Card>
      <CardHeader title="Profile" description="Shown on posts you don't share anonymously." />
      <form
        noValidate
        className="space-y-4 p-5"
        onSubmit={handleSubmit((values) =>
          update.mutate(values, {
            onSuccess: (u) => {
              reset({ name: u.name, branch: u.branch ?? '', gradYear: u.gradYear });
              toast('Profile saved');
            },
            onError: (e) => toast(errorMessage(e), 'error'),
          }),
        )}
      >
        <Field label="Full name" error={errors.name?.message}>
          {(id) => <Input id={id} autoComplete="name" {...register('name')} />}
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Branch" error={errors.branch?.message}>
            {(id) => <Input id={id} {...register('branch')} />}
          </Field>
          <Field label="Graduation year" error={errors.gradYear?.message}>
            {(id) => <Input id={id} type="number" inputMode="numeric" {...register('gradYear', { valueAsNumber: true })} />}
          </Field>
        </div>
        <Button type="submit" loading={update.isPending} disabled={!isDirty}>
          Save profile
        </Button>
      </form>
    </Card>
  );
}

function PasswordCard() {
  const change = useChangePassword();
  const toast = useToast();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ChangePasswordInput>({ resolver: zodResolver(changePasswordSchema) });
  return (
    <Card>
      <CardHeader title="Password" />
      <form
        noValidate
        className="space-y-4 p-5"
        onSubmit={handleSubmit((values) =>
          change.mutate(values, {
            onSuccess: () => {
              reset({ currentPassword: '', newPassword: '' });
              toast('Password updated');
            },
            onError: (e) => toast(errorMessage(e), 'error'),
          }),
        )}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Current password" error={errors.currentPassword?.message}>
            {(id) => <Input id={id} type="password" autoComplete="current-password" {...register('currentPassword')} />}
          </Field>
          <Field label="New password" error={errors.newPassword?.message} hint="At least 8 characters">
            {(id) => <Input id={id} type="password" autoComplete="new-password" {...register('newPassword')} />}
          </Field>
        </div>
        <Button type="submit" variant="secondary" loading={change.isPending}>
          Change password
        </Button>
      </form>
    </Card>
  );
}

function DangerCard() {
  const del = useDeleteAccount();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  return (
    <Card className="border-danger/30">
      <CardHeader
        title="Delete account"
        description="Your published posts stay up (anonymously) because juniors rely on them. Drafts and posts in review are deleted."
        action={
          <Button variant="danger-ghost" size="sm" onClick={() => setOpen(true)}>
            Delete…
          </Button>
        }
        className="border-b-0"
      />
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Delete your account?"
        description="This can't be undone. Enter your password to confirm."
      >
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            del.mutate(password, {
              onSuccess: () => {
                signOut();
                toast('Your account was deleted');
                navigate('/', { replace: true });
              },
              onError: (err) => toast(errorMessage(err), 'error'),
            });
          }}
        >
          <Field label="Password">
            {(id) => (
              <Input
                id={id}
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
              />
            )}
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="danger" loading={del.isPending} disabled={!password}>
              Delete account
            </Button>
          </div>
        </form>
      </Dialog>
    </Card>
  );
}
