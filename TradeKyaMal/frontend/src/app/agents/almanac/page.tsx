import { PageHeader } from '@/components/PageHeader';
import { AgentWeekDashboard } from '@/components/AgentWeekDashboard';

export default function AlmanacAgentPage() {
  return (
    <div>
      <PageHeader title="Almanac Agent" />
      <AgentWeekDashboard agentFilter="almanac" view="agent" />
    </div>
  );
}
