import { PageHeader } from '@/components/PageHeader';
import { MacroAgentReport } from '@/components/MacroAgentReport';
import { AgentWeekDashboard } from '@/components/AgentWeekDashboard';

export default function MacroAgentPage() {
  return (
    <div className="space-y-8">
      <PageHeader title="Macro Agent" description="Live data, sector performance, and weekly report." />
      <MacroAgentReport />
      <AgentWeekDashboard agentFilter="macro" showFinalHero={false} />
    </div>
  );
}
