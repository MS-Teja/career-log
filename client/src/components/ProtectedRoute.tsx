import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import type { Role } from '@career-log/shared';
import { useAuth } from '@/context/AuthContext';
import { EmptyState } from './EmptyState';
import { PageHeader } from './PageHeader';
import { RequestSeniorAccess } from './RequestSeniorAccess';
import { Skeleton } from './ui/Skeleton';

export function ProtectedRoute({ roles, children }: { roles?: Role[]; children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading)
    return (
      <div className="container-page space-y-3 py-10">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  if (roles && !roles.includes(user.role)) {
    // Juniors who try to post get a path forward instead of a dead end.
    if (roles.includes('senior') && user.role === 'junior')
      return (
        <div className="container-page max-w-2xl pb-16">
          <PageHeader title="Share your interview experience" description="Posting is open to seniors verified by the placement cell." />
          <RequestSeniorAccess />
        </div>
      );
    return (
      <div className="container-page py-16">
        <EmptyState title="You don't have access to this page" />
      </div>
    );
  }
  return <>{children}</>;
}
