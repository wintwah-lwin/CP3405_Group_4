import {
  Database,
  Layers,
  Clock,
  Bot,
} from 'lucide-react';
import { StatCard } from '@/components/StatCard';
import { AgentCard } from '@/components/AgentCard';
import { PageHeader } from '@/components/PageHeader';
import { apiFetch } from '@/lib/api';
import type { Agent, DashboardStats } from '@/lib/types';

async function getDashboardData() {
  try {
    const [stats, agents] = await Promise.all([
      apiFetch<DashboardStats>('/api/data-collection/stats'),
      apiFetch<Agent[]>('/api/agents'),
    ]);
    return { stats, agents, error: null };
  } catch {
    return {
      stats: {
        totalDataPoints: 0,
        activeSymbols: 0,
        lastCollection: null,
        agentCount: 3,
      } as DashboardStats,
      agents: [] as Agent[],
      error: 'Backend unavailable — start the server to load live data.',
    };
  }
}

export default async function OverviewPage() {
  const { stats, agents, error } = await getDashboardData();

  const fallbackAgents: Agent[] = [
    {
      id: 'almanac',
      name: 'Almanac Agent',
      description: 'Seasonal and calendar-based pattern analysis.',
      status: 'idle',
    },
    {
      id: 'macro',
      name: 'Macro Agent',
      description: 'Macroeconomic indicators and global context.',
      status: 'idle',
    },
    {
      id: 'technical',
      name: 'Technical Agent',
      description: 'Price action and technical signal generation.',
      status: 'idle',
    },
  ];

  const displayAgents = agents.length > 0 ? agents : fallbackAgents;

  return (
    <div>
      <PageHeader
        title="Overview"
        description="Trading intelligence platform for data collection and multi-agent analysis."
      />

      {error && (
        <div className="mb-6 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Data Points"
          value={stats.totalDataPoints}
          icon={Database}
          variant="accent"
        />
        <StatCard
          label="Active Symbols"
          value={stats.activeSymbols}
          icon={Layers}
        />
        <StatCard
          label="Agents"
          value={stats.agentCount}
          icon={Bot}
        />
        <StatCard
          label="Last Collection"
          value={
            stats.lastCollection
              ? new Date(stats.lastCollection).toLocaleDateString()
              : '—'
          }
          icon={Clock}
        />
      </div>

      <div className="mt-8">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-text-muted">
          Trading Agents
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          {displayAgents.map((agent) => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>
      </div>

      <div className="mt-8 rounded-xl border border-border-subtle bg-surface-raised p-6">
        <h2 className="text-sm font-semibold">Platform Architecture</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-text-secondary">
          TradeKyaMal separates concerns into three layers: a{' '}
          <span className="text-text-primary">data collection</span> layer that
          ingests market and macro data, three specialised{' '}
          <span className="text-text-primary">agents</span> (Almanac, Macro,
          Technical) that analyse it, and this{' '}
          <span className="text-text-primary">dashboard</span> for monitoring
          and control. Start by collecting data, then wire each agent to
          produce signals.
        </p>
      </div>
    </div>
  );
}
