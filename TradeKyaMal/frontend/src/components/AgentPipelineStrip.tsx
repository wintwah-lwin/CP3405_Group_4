import Link from 'next/link';
import { ArrowRight, Calendar, BarChart3, TrendingUp, Sparkles, Target } from 'lucide-react';
import clsx from 'clsx';

const steps = [
  { href: '/agents/almanac', label: 'Almanac', icon: Calendar },
  { href: '/agents/macro', label: 'Macro', icon: BarChart3 },
  { href: '/agents/technical', label: 'Technical', icon: TrendingUp },
  { href: '/agents/llm', label: 'LLM', icon: Sparkles },
  { href: '/agents/final', label: 'Final', icon: Target },
];

export function AgentPipelineStrip() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {steps.map((step, index) => {
        const Icon = step.icon;
        return (
          <div key={step.href} className="flex items-center gap-2">
            <Link
              href={step.href}
              className={clsx(
                'group flex items-center gap-2 rounded-xl border border-border-subtle bg-surface-raised/80 px-3.5 py-2.5',
                'transition-all hover:border-accent/40 hover:bg-accent/5'
              )}
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface-overlay group-hover:bg-accent/15">
                <Icon className="h-3.5 w-3.5 text-text-secondary group-hover:text-accent" />
              </span>
              <span className="text-xs font-medium text-text-primary">{step.label}</span>
            </Link>
            {index < steps.length - 1 && (
              <ArrowRight className="hidden h-3.5 w-3.5 text-text-muted sm:block" />
            )}
          </div>
        );
      })}
    </div>
  );
}
