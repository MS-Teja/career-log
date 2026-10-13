import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema, type RegisterInput } from '@career-log/shared';
import { api, errorMessage } from '@/api/client';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Form';
import { AuthLayout } from './AuthLayout';

export default function Register() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const { data: config } = useQuery({
    queryKey: ['auth-config'],
    queryFn: () => api.get<{ allowedDomains: string[] }>('/auth/config').then((r) => r.data),
  });
  const domainHint = config?.allowedDomains.length ? `Must end in ${config.allowedDomains.map((d) => '@' + d).join(' or ')}` : undefined;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) });

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    try {
      await api.post('/auth/register', values);
      navigate('/verify', { state: { email: values.email } });
    } catch (err) {
      setError(errorMessage(err));
    }
  });

  return (
    <AuthLayout
      title="Join Career Log"
      subtitle="Only students with a college email can join, so every experience comes from someone on campus."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-accent hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Field label="Full name" error={errors.name?.message}>
          {(id) => <Input id={id} autoComplete="name" {...register('name')} />}
        </Field>
        <Field label="College email" error={errors.email?.message} hint={domainHint}>
          {(id) => <Input id={id} type="email" autoComplete="email" {...register('email')} />}
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Branch" error={errors.branch?.message}>
            {(id) => <Input id={id} placeholder="CSE" {...register('branch')} />}
          </Field>
          <Field label="Graduation year" error={errors.gradYear?.message}>
            {(id) => (
              <Input
                id={id}
                type="number"
                inputMode="numeric"
                placeholder={String(new Date().getFullYear() + 1)}
                {...register('gradYear', { valueAsNumber: true })}
              />
            )}
          </Field>
        </div>
        <Field label="Password" error={errors.password?.message} hint="At least 8 characters">
          {(id) => <Input id={id} type="password" autoComplete="new-password" {...register('password')} />}
        </Field>
        {error && (
          <p role="alert" className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}
        <Button type="submit" className="w-full" loading={isSubmitting}>
          Send verification code
        </Button>
        <p className="text-center text-[13px] text-muted">
          Placed already? After signing up, request senior access from Settings to share your experience.
        </p>
      </form>
    </AuthLayout>
  );
}
