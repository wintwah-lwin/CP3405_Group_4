import Link from 'next/link';
import { Calendar, BarChart3, TrendingUp, Sparkles, Target, ArrowRight } from 'lucide-react';
import clsx from 'clsx';
import type { Agent, AgentType } from '@/lib/types';

const agentIcons: Record<AgentType, typeof Calendar> = {
  almanac: Calendar,
  macro: BarChart3,
  technical: TrendingUp,
  llm: Sparkles,
  final: Target,
};

const agentLinks: Record<AgentType, string> = {
  almanac: '/agents/almanac',
  macro: '/agents/macro',
  technical: '/agents/technical',
  llm: '/agents/llm',
  final: '/agents/final',
};

const statusStyles = {
  idle: 'bg-surface-overlay text-text-muted',
  running: 'bg-accent/15 text-accent',
  completed: 'bg-positive/15 text-positive',
  error: 'bg-negative/15 text-negative',
};

interface AgentCardProps {
  agent: Agent;
}

export function AgentCard({ agent }: AgentCardProps) {
  const Icon = agentIcons[agent.id];

  return (
    <Link
      href={agentLinks[agent.id]}
      className="group block rounded-2xl border border-border-subtle bg-surface-raised/80 p-5 shadow-sm shadow-black/10 transition-all hover:border-accent/30 hover:shadow-md hover:shadow-accent/5"
    >
      <div className="flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-overlay transition-colors group-hover:bg-accent/10">
          <Icon className="h-5 w-5 text-text-secondary transition-colors group-hover:text-accent" />
        </div>
        <span
          className={clsx(
            'rounded-full px-2.5 py-0.5 text-[11px] font-medium capitalize',
            statusStyles[agent.status]
          )}
        >
          {agent.status}
        </span>
      </div>

      <h3 className="mt-4 text-sm font-semibold">{agent.name}</h3>
      {agent.summary && (
        <p className="mt-1.5 line-clamp-2 text-xs text-text-secondary">{agent.summary}</p>
      )}

      <div className="mt-4 flex items-center justify-between border-t border-border-subtle pt-4">
        <p className="text-[11px] text-text-muted">
          {agent.lastRun
            ? new Date(agent.lastRun).toLocaleDateString()
            : 'Pipeline'}
        </p>
        <span className="flex items-center gap-1 text-xs font-medium text-accent">
          Open <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}
