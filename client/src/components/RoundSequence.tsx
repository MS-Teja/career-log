import { Fragment } from 'react';
import { ROUND_TYPE_LABELS, type RoundType } from '@career-log/shared';
import { cn } from '@/lib/utils';

const SHORT: Record<RoundType, string> = {
  'online-assessment': 'OA',
  coding: 'Coding',
  technical: 'Technical',
  'system-design': 'Sys design',
  managerial: 'Managerial',
  hr: 'HR',
  'group-discussion': 'GD',
};

export function RoundSequence({ types, className }: { types: RoundType[]; className?: string }) {
  return (
    <div className={cn('flex flex-wrap items-center gap-x-1 gap-y-1 text-xs text-muted', className)}>
      {types.map((t, i) => (
        <Fragment key={i}>
          {i > 0 && (
            <span aria-hidden className="text-muted/50">
              →
            </span>
          )}
          <span title={ROUND_TYPE_LABELS[t]} className="rounded bg-surface-2 px-1.5 py-px">
            {SHORT[t]}
          </span>
        </Fragment>
      ))}
    </div>
  );
}
