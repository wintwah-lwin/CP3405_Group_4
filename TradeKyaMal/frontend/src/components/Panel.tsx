import clsx from 'clsx';

interface PanelProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md';
}

export function Panel({ children, className, padding = 'md' }: PanelProps) {
  return (
    <section
      className={clsx(
        'rounded-2xl border border-border-subtle bg-surface-raised/80 shadow-sm shadow-black/20 backdrop-blur-sm',
        padding === 'md' && 'p-5',
        padding === 'sm' && 'p-4',
        className
      )}
    >
      {children}
    </section>
  );
}

interface SectionHeaderProps {
  title: string;
  action?: React.ReactNode;
}

export function SectionHeader({ title, action }: SectionHeaderProps) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h3 className="text-sm font-semibold tracking-tight text-text-primary">{title}</h3>
      {action}
    </div>
  );
}
