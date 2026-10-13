import type { ReactNode } from 'react';

export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="container-page flex min-h-[calc(100dvh-56px)] items-start justify-center py-12 sm:items-center">
      <div className="w-full max-w-md">
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="mt-2 text-muted">{subtitle}</p>}
        <div className="mt-7 rounded-xl border border-border bg-surface p-6 shadow-sm">{children}</div>
        {footer && <p className="mt-5 text-center text-sm text-muted">{footer}</p>}
      </div>
    </div>
  );
}
