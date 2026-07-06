import Link from 'next/link';
import { Calendar, BarChart3, TrendingUp, ArrowRight } from 'lucide-react';
import clsx from 'clsx';
import type { Agent, AgentType } from '@/lib/types';

const agentIcons: Record<AgentType, typeof Calendar> = {
  almanac: Calendar,
  macro: BarChart3,
  technical: TrendingUp,
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
    <div className="rounded-xl border border-border-subtle bg-surface-raised p-5">
      <div className="flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-overlay">
          <Icon className="h-5 w-5 text-text-secondary" />
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
      <p className="mt-1.5 text-xs leading-relaxed text-text-secondary">
        {agent.summary ?? agent.description}
      </p>

      <div className="mt-4 flex items-center justify-between border-t border-border-subtle pt-4">
        <p className="text-[11px] text-text-muted">
          {agent.lastRun
            ? `Last run: ${new Date(agent.lastRun).toLocaleDateString()}`
            : 'Not yet configured'}
        </p>
        <Link
          href={`/agents/${agent.id}`}
          className="flex items-center gap-1 text-xs text-accent hover:underline"
        >
          View <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}
