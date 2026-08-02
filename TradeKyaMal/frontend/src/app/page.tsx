import {
  Database,
  Layers,
  Clock,
  Bot,
} from 'lucide-react';
import { StatCard } from '@/components/StatCard';
import { PageHeader } from '@/components/PageHeader';
import { AgentWeekDashboard } from '@/components/AgentWeekDashboard';
import { AgentPipelineStrip } from '@/components/AgentPipelineStrip';
import { Panel, SectionHeader } from '@/components/Panel';
import { apiFetch } from '@/lib/api';
import type { DashboardStats } from '@/lib/types';

async function getDashboardData() {
  try {
    const stats = await apiFetch<DashboardStats>('/api/data-collection/stats');
    return { stats, error: null };
  } catch {
    return {
      stats: {
        totalDataPoints: 0,
        activeSymbols: 0,
        lastCollection: null,
        agentCount: 5,
      } as DashboardStats,
      error: null,
    };
  }
}

export default async function OverviewPage() {
  const { stats } = await getDashboardData();

  return (
    <div className="space-y-8">
      <PageHeader title="Overview" />

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

      <Panel>
        <SectionHeader title="Agent Pipeline" />
        <AgentPipelineStrip />
      </Panel>

      <AgentWeekDashboard view="overview" />
    </div>
  );
}
