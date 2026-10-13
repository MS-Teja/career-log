import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import type { PublicUser } from '@career-log/shared';
import { api, errorMessage } from '@/api/client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Form';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/context/AuthContext';
import { AuthLayout } from './AuthLayout';

export default function VerifyOtp() {
  const location = useLocation();
  const state = location.state as { email?: string; from?: string } | null;
  const email = state?.email;
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const toast = useToast();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [cooldown, setCooldown] = useState(60);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  if (!email) return <Navigate to="/register" replace />;

  const submit = async (value = code) => {
    // Guard against Enter racing the auto-submit on the 6th digit.
    if (value.length !== 6 || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const { data } = await api.post<{ token: string; user: PublicUser }>('/auth/verify-otp', { email, code: value });
      signIn(data.token, data.user);
      toast(`Welcome, ${data.user.name.split(' ')[0]}!`);
      navigate(state?.from ?? '/browse', { replace: true });
    } catch (err) {
      setError(errorMessage(err));
      setCode('');
    } finally {
      setSubmitting(false);
    }
  };

  const resend = async () => {
    try {
      await api.post('/auth/resend-otp', { email });
      toast('A new code is on its way');
      setCooldown(60);
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  };

  return (
    <AuthLayout
      title="Check your inbox"
      subtitle={
        <>
          We sent a 6-digit code to <span className="font-medium text-ink">{email}</span>. It expires in 10 minutes.
        </>
      }
      footer={
        <Link to="/register" className="hover:text-ink">
          Wrong email? Start over
        </Link>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="space-y-4"
      >
        <Input
          value={code}
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, '').slice(0, 6);
            setCode(v);
            if (v.length === 6) submit(v);
          }}
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          placeholder="••••••"
          aria-label="Verification code"
          className="h-14 text-center font-mono text-2xl tracking-[0.5em]"
        />
        {error && (
          <p role="alert" className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}
        <Button type="submit" className="w-full" loading={submitting} disabled={code.length !== 6}>
          Verify
        </Button>
        <p className="text-center text-sm text-muted">
          Didn’t get it?{' '}
          {cooldown > 0 ? (
            <span className="meta">Resend in {cooldown}s</span>
          ) : (
            <button type="button" onClick={resend} className="font-medium text-accent hover:underline">
              Resend code
            </button>
          )}
        </p>
      </form>
    </AuthLayout>
  );
}
