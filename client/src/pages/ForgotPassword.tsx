import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { emailSchema, resetPasswordSchema, type PublicUser, type ResetPasswordInput } from '@career-log/shared';
import { api, errorMessage } from '@/api/client';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Form';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/context/AuthContext';
import { AuthLayout } from './AuthLayout';

/** Two steps: request a code by email, then set a new password with it. */
export default function ForgotPassword() {
  const [email, setEmail] = useState<string | null>(null);
  return email ? <ResetStep email={email} onBack={() => setEmail(null)} /> : <RequestStep onSent={setEmail} />;
}

function RequestStep({ onSent }: { onSent: (email: string) => void }) {
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<{ email: string }>({ resolver: zodResolver(emailSchema) });

  return (
    <AuthLayout
      title="Reset your password"
      subtitle="We'll email you a 6-digit code."
      footer={
        <Link to="/login" className="hover:text-ink">
          Back to sign in
        </Link>
      }
    >
      <form
        noValidate
        className="space-y-4"
        onSubmit={handleSubmit(async ({ email }) => {
          setError(null);
          try {
            await api.post('/auth/forgot', { email });
            onSent(email);
          } catch (err) {
            setError(errorMessage(err));
          }
        })}
      >
        <Field label="College email" error={errors.email?.message}>
          {(id) => <Input id={id} type="email" autoComplete="email" autoFocus {...register('email')} />}
        </Field>
        {error && (
          <p role="alert" className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}
        <Button type="submit" className="w-full" loading={isSubmitting}>
          Send reset code
        </Button>
      </form>
    </AuthLayout>
  );
}

function ResetStep({ email, onBack }: { email: string; onBack: () => void }) {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordInput>({ resolver: zodResolver(resetPasswordSchema), defaultValues: { email } });

  return (
    <AuthLayout
      title="Check your inbox"
      subtitle={
        <>
          If an account exists for <span className="font-medium text-ink">{email}</span>, we sent it a code. It expires in 10 minutes.
        </>
      }
      footer={
        <button onClick={onBack} className="hover:text-ink">
          Use a different email
        </button>
      }
    >
      <form
        noValidate
        className="space-y-4"
        onSubmit={handleSubmit(async (values) => {
          setError(null);
          try {
            const { data } = await api.post<{ token: string; user: PublicUser }>('/auth/reset', values);
            signIn(data.token, data.user);
            toast('Password updated, you are signed in');
            navigate('/browse', { replace: true });
          } catch (err) {
            setError(errorMessage(err));
          }
        })}
      >
        <Field label="6-digit code" error={errors.code?.message}>
          {(id) => (
            <Input
              id={id}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              autoFocus
              className="font-mono tracking-[0.3em]"
              {...register('code')}
            />
          )}
        </Field>
        <Field label="New password" error={errors.password?.message} hint="At least 8 characters">
          {(id) => <Input id={id} type="password" autoComplete="new-password" {...register('password')} />}
        </Field>
        {error && (
          <p role="alert" className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}
        <Button type="submit" className="w-full" loading={isSubmitting}>
          Set new password
        </Button>
      </form>
    </AuthLayout>
  );
}
