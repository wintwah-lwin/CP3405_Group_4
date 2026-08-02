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
    <div className="group rounded-2xl border border-border-subtle bg-surface-raised/80 p-5 shadow-sm shadow-black/10 transition-colors hover:border-border">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-text-muted">{label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
          {trend && (
            <p className="mt-1 text-xs text-text-secondary">{trend}</p>
          )}
        </div>
        <div
          className={clsx(
            'flex h-10 w-10 items-center justify-center rounded-xl transition-colors',
            variant === 'accent'
              ? 'bg-accent/15 group-hover:bg-accent/20'
              : 'bg-surface-overlay group-hover:bg-surface-overlay/80'
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
