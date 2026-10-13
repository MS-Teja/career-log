import axios, { AxiosError } from 'axios';
import { storage } from '@/lib/utils';

export const TOKEN_KEY = 'cl_token';

/** True when the stored JWT is missing or within a minute of expiring. */
export function tokenExpired() {
  const token = storage.get(TOKEN_KEY);
  if (!token) return true;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]!.replace(/-/g, '+').replace(/_/g, '/'))) as { exp?: number };
    return !!payload.exp && payload.exp * 1000 < Date.now() + 60_000;
  } catch {
    return true;
  }
}

export const api = axios.create({ baseURL: import.meta.env.VITE_API_URL ?? '/api' });

api.interceptors.request.use((config) => {
  const token = storage.get(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err: AxiosError<{ code?: string }>) => {
    if (err.response?.data?.code === 'TOKEN_INVALID') {
      storage.set(TOKEN_KEY, null);
      window.dispatchEvent(new Event('cl:logout'));
    }
    return Promise.reject(err);
  },
);

export interface ApiErrorBody {
  message?: string;
  code?: string;
  issues?: { path: string; message: string }[];
}

export function errorMessage(err: unknown, fallback = 'Something went wrong') {
  if (err instanceof AxiosError) {
    const body = err.response?.data as ApiErrorBody | undefined;
    if (body?.message) return body.message;
    if (!err.response) return 'Cannot reach the server. Is the API running?';
  }
  return fallback;
}

export function errorCode(err: unknown) {
  return err instanceof AxiosError ? (err.response?.data as ApiErrorBody | undefined)?.code : undefined;
}
