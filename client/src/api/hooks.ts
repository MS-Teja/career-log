import { keepPreviousData, useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import type {
  Badges,
  ChangePasswordInput,
  Company,
  CompanyAnalytics,
  CompanyInput,
  Experience,
  ExperienceUpdateInput,
  Facets,
  ModerationInput,
  OverviewStats,
  Paginated,
  PrepPlan,
  PrepPlanInput,
  ProfileInput,
  PublicUser,
  QuestionItem,
  Role,
  SeniorDecisionInput,
} from '@career-log/shared';
import { api } from './client';

export type ExperienceFilters = Partial<
  Record<'company' | 'role' | 'year' | 'roundType' | 'topic' | 'result' | 'q' | 'sort' | 'page', string>
>;
export type QuestionFilters = Partial<Record<'company' | 'topic' | 'roundType' | 'year' | 'q' | 'page', string>>;

const get = <T>(url: string, params?: object) => api.get<T>(url, { params }).then((r) => r.data);

/** Every query whose data depends on which experiences are published. */
function invalidatePublished(qc: QueryClient) {
  for (const key of [
    'experiences',
    'overview',
    'company-analytics',
    'questions',
    'compare',
    'prep',
    'companies',
    'facets',
    'me',
    'admin',
    'badges',
  ]) {
    qc.invalidateQueries({ queryKey: [key] });
  }
}

// Queries

export const useOverview = () => useQuery({ queryKey: ['overview'], queryFn: () => get<OverviewStats>('/analytics/overview') });

export const useCompanies = () => useQuery({ queryKey: ['companies'], queryFn: () => get<Company[]>('/companies'), staleTime: 60_000 });

export const useFacets = () => useQuery({ queryKey: ['facets'], queryFn: () => get<Facets>('/experiences/facets'), staleTime: 5 * 60_000 });

export const useCompanyAnalytics = (slug: string) =>
  useQuery({ queryKey: ['company-analytics', slug], queryFn: () => get<CompanyAnalytics>(`/companies/${slug}/analytics`) });

export const useCompare = (slugs: string[]) =>
  useQuery({
    queryKey: ['compare', slugs],
    queryFn: () => get<CompanyAnalytics[]>('/compare', { c: slugs.join(',') }),
    enabled: slugs.length > 0,
    placeholderData: keepPreviousData,
  });

export const useExperiences = (filters: ExperienceFilters, limit?: number) =>
  useQuery({
    queryKey: ['experiences', filters, limit],
    queryFn: () => get<Paginated<Experience>>('/experiences', { ...filters, limit }),
    placeholderData: keepPreviousData,
  });

export const useQuestions = (filters: QuestionFilters) =>
  useQuery({
    queryKey: ['questions', filters],
    queryFn: () => get<Paginated<QuestionItem>>('/questions', filters),
    placeholderData: keepPreviousData,
  });

export const useExperience = (id: string | undefined) =>
  useQuery({
    queryKey: ['experience', id],
    queryFn: () => get<Experience>(`/experiences/${id}`),
    enabled: !!id,
  });

export const useMyExperiences = () => useQuery({ queryKey: ['me', 'experiences'], queryFn: () => get<Experience[]>('/me/experiences') });
export const useBookmarks = () => useQuery({ queryKey: ['me', 'bookmarks'], queryFn: () => get<Experience[]>('/me/bookmarks') });

export const useBadges = (enabled: boolean) =>
  useQuery({ queryKey: ['badges'], queryFn: () => get<Badges>('/me/badges'), enabled, refetchInterval: 60_000 });

// Experience mutations

export function useSaveExperience(id?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ExperienceUpdateInput) =>
      (id ? api.put<Experience>(`/experiences/${id}`, body) : api.post<Experience>('/experiences', body)).then((r) => r.data),
    onSuccess: (saved) => {
      qc.setQueryData(['experience', saved._id], saved);
      invalidatePublished(qc);
    },
  });
}

export function useDeleteExperience() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/experiences/${id}`).then(() => id),
    onSuccess: (id) => {
      // Drop the detail first so the open page doesn't refetch a 404.
      qc.removeQueries({ queryKey: ['experience', id] });
      invalidatePublished(qc);
    },
  });
}

/** Patches an experience wherever it appears in the cache. */
function patchExperienceCache(qc: QueryClient, id: string, patch: (e: Experience) => Partial<Experience>) {
  const apply = (e: Experience) => (e._id === id ? { ...e, ...patch(e) } : e);
  qc.setQueryData<Experience>(['experience', id], (old) => (old ? apply(old) : old));
  qc.setQueriesData<Paginated<Experience>>({ queryKey: ['experiences'] }, (old) => (old ? { ...old, items: old.items.map(apply) } : old));
  qc.setQueriesData<Experience[]>({ queryKey: ['me'] }, (old) => (Array.isArray(old) ? old.map(apply) : old));
}

export function useToggleUpvote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (exp: Experience) =>
      api.post<{ upvoted: boolean; upvoteCount: number }>(`/experiences/${exp._id}/upvote`).then((r) => r.data),
    // Optimistic: flip immediately, roll back on error.
    onMutate: (exp) => {
      patchExperienceCache(qc, exp._id, () => ({
        hasUpvoted: !exp.hasUpvoted,
        upvoteCount: exp.upvoteCount + (exp.hasUpvoted ? -1 : 1),
      }));
      return exp;
    },
    onError: (_err, exp) => patchExperienceCache(qc, exp._id, () => ({ hasUpvoted: exp.hasUpvoted, upvoteCount: exp.upvoteCount })),
    onSuccess: (res, exp) => patchExperienceCache(qc, exp._id, () => ({ hasUpvoted: res.upvoted, upvoteCount: res.upvoteCount })),
  });
}

export function useToggleBookmark() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, bookmarked }: { id: string; bookmarked: boolean }) =>
      (bookmarked ? api.delete(`/me/bookmarks/${id}`) : api.post(`/me/bookmarks/${id}`)).then(() => ({ id, isBookmarked: !bookmarked })),
    onMutate: ({ id, bookmarked }) => patchExperienceCache(qc, id, () => ({ isBookmarked: !bookmarked })),
    onError: (_err, { id, bookmarked }) => patchExperienceCache(qc, id, () => ({ isBookmarked: bookmarked })),
    onSettled: () => qc.invalidateQueries({ queryKey: ['me', 'bookmarks'] }),
  });
}

export const useReportExperience = () =>
  useMutation({ mutationFn: ({ id, reason }: { id: string; reason: string }) => api.post(`/experiences/${id}/report`, { reason }) });

export function useCreateCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CompanyInput) => api.post<Company>('/companies', body).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['companies'] }),
  });
}

// Account

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ProfileInput) => api.patch<{ user: PublicUser }>('/me', body).then((r) => r.data.user),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['auth'] }),
  });
}

export const useChangePassword = () => useMutation({ mutationFn: (body: ChangePasswordInput) => api.post('/me/password', body) });
export const useDeleteAccount = () => useMutation({ mutationFn: (password: string) => api.post('/me/delete', { password }) });

export function useRequestSenior() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (note: string) => api.post<{ user: PublicUser }>('/me/senior-request', { note }).then((r) => r.data.user),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['auth'] }),
  });
}

export const usePrep = (enabled = true) => useQuery({ queryKey: ['prep'], queryFn: () => get<PrepPlan>('/me/prep'), enabled });

export function useSavePrep() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: PrepPlanInput) => api.put<PrepPlan>('/me/prep', body).then((r) => r.data),
    onSuccess: (plan) => qc.setQueryData(['prep'], plan),
  });
}

// Admin

export interface AdminStats {
  pending: number;
  approved: number;
  rejected: number;
  flagged: number;
  users: number;
}

export const useAdminStats = () => useQuery({ queryKey: ['admin', 'stats'], queryFn: () => get<AdminStats>('/admin/stats') });
export const useAdminQueue = (status: 'pending' | 'rejected') =>
  useQuery({ queryKey: ['admin', 'queue', status], queryFn: () => get<Experience[]>('/admin/queue', { status }) });
export const useAdminReports = () => useQuery({ queryKey: ['admin', 'reports'], queryFn: () => get<Experience[]>('/admin/reports') });
export const useAdminUsers = (q: string) =>
  useQuery({ queryKey: ['admin', 'users', q], queryFn: () => get<PublicUser[]>('/admin/users', { q }), placeholderData: keepPreviousData });
export const useSeniorRequests = () =>
  useQuery({ queryKey: ['admin', 'senior-requests'], queryFn: () => get<PublicUser[]>('/admin/senior-requests') });

export function useModerate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: ModerationInput & { id: string }) => api.patch(`/admin/experiences/${id}`, body).then(() => id),
    onSuccess: (id) => {
      qc.invalidateQueries({ queryKey: ['experience', id] });
      invalidatePublished(qc);
    },
  });
}

export function useDecideSenior() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: SeniorDecisionInput & { id: string }) => api.patch(`/admin/users/${id}/senior-request`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin'] });
      qc.invalidateQueries({ queryKey: ['badges'] });
    },
  });
}

export function useSaveCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: CompanyInput & { id?: string }) =>
      (id ? api.put<Company>(`/admin/companies/${id}`, body) : api.post<Company>('/admin/companies', body)).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['companies'] }),
  });
}

export function useMergeCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, intoId }: { id: string; intoId: string }) =>
      api.post<{ company: Company; moved: number }>(`/admin/companies/${id}/merge`, { intoId }).then((r) => r.data),
    onSuccess: () => invalidatePublished(qc),
  });
}

export function useDeleteCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/admin/companies/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['companies'] }),
  });
}

export function useUpdateRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, role }: { id: string; role: Role }) => api.patch(`/admin/users/${id}/role`, { role }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });
}
