import type { ReactNode } from 'react';

export function PageHeader({ title, description, action }: { title: ReactNode; description?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col gap-4 pb-6 pt-8 sm:flex-row sm:items-end sm:justify-between sm:pt-10">
      <div>
        <h1 className="page-title">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-[15px] text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}
