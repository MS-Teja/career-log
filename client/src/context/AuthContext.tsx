import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { PublicUser } from '@career-log/shared';
import { api, TOKEN_KEY } from '@/api/client';
import { storage } from '@/lib/utils';

interface AuthState {
  user: PublicUser | null;
  isLoading: boolean;
  signIn: (token: string, user: PublicUser) => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const [token, setToken] = useState(() => storage.get(TOKEN_KEY));

  const { data, isLoading } = useQuery({
    queryKey: ['auth', 'me', token],
    queryFn: () => api.get<{ user: PublicUser }>('/auth/me').then((r) => r.data.user),
    enabled: !!token,
    retry: false,
    staleTime: 5 * 60_000,
  });

  /** Switches the active session. Everything cached belongs to the previous user, so it all goes. */
  const switchTo = useCallback(
    (next: string | null, user?: PublicUser) => {
      qc.clear();
      if (next && user) qc.setQueryData(['auth', 'me', next], user);
      setToken(next);
    },
    [qc],
  );

  const signIn = useCallback(
    (newToken: string, user: PublicUser) => {
      storage.set(TOKEN_KEY, newToken);
      switchTo(newToken, user);
    },
    [switchTo],
  );

  const signOut = useCallback(() => {
    storage.set(TOKEN_KEY, null);
    switchTo(null);
  }, [switchTo]);

  useEffect(() => {
    // The API client fires this when the server rejects the token.
    const onForcedLogout = () => switchTo(null);
    // Sign-in/out in another tab.
    const onStorage = (e: StorageEvent) => {
      if (e.key === TOKEN_KEY) switchTo(e.newValue);
    };
    window.addEventListener('cl:logout', onForcedLogout);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('cl:logout', onForcedLogout);
      window.removeEventListener('storage', onStorage);
    };
  }, [switchTo]);

  const value = useMemo<AuthState>(
    () => ({ user: token ? (data ?? null) : null, isLoading: !!token && isLoading, signIn, signOut }),
    [token, data, isLoading, signIn, signOut],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
