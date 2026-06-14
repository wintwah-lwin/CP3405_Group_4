import { LucideIcon } from 'lucide-react';
import clsx from 'clsx';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  variant?: 'default' | 'accent';
}

export function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  variant = 'default',
}: StatCardProps) {
  return (
    <div className="rounded-xl border border-border-subtle bg-surface-raised p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-text-muted">
            {label}
          </p>
          <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
          {trend && (
            <p className="mt-1 text-xs text-text-secondary">{trend}</p>
          )}
        </div>
        <div
          className={clsx(
            'flex h-9 w-9 items-center justify-center rounded-lg',
            variant === 'accent' ? 'bg-accent/15' : 'bg-surface-overlay'
          )}
        >
          <Icon
            className={clsx(
              'h-4 w-4',
              variant === 'accent' ? 'text-accent' : 'text-text-secondary'
            )}
          />
        </div>
      </div>
    </div>
  );
}
