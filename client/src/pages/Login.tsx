import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginInput, type PublicUser } from '@career-log/shared';
import { api, errorCode, errorMessage } from '@/api/client';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Form';
import { useAuth } from '@/context/AuthContext';
import { AuthLayout } from './AuthLayout';

export default function Login() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/';
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    try {
      const { data } = await api.post<{ token: string; user: PublicUser }>('/auth/login', values);
      signIn(data.token, data.user);
      navigate(from, { replace: true });
    } catch (err) {
      if (errorCode(err) === 'UNVERIFIED') {
        navigate('/verify', { state: { email: values.email, from } });
        return;
      }
      setError(errorMessage(err));
    }
  });

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in with your college email."
      footer={
        <>
          New here?{' '}
          <Link to="/register" className="font-medium text-accent hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Field label="College email" error={errors.email?.message}>
          {(id) => <Input id={id} type="email" autoComplete="email" {...register('email')} />}
        </Field>
        <Field
          label="Password"
          error={errors.password?.message}
          hint={
            <Link to="/forgot" className="font-medium text-accent hover:underline">
              Forgot password?
            </Link>
          }
        >
          {(id) => <Input id={id} type="password" autoComplete="current-password" {...register('password')} />}
        </Field>
        {error && (
          <p role="alert" className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}
        <Button type="submit" className="w-full" loading={isSubmitting}>
          Sign in
        </Button>
      </form>
    </AuthLayout>
  );
}
