import { PageHeader } from '@/components/PageHeader';
import { AgentWeekDashboard } from '@/components/AgentWeekDashboard';

export default function AlmanacAgentPage() {
  return (
    <div>
      <PageHeader title="Almanac Agent" description="Weekly bias, market snapshot, and report." />
      <AgentWeekDashboard agentFilter="almanac" showFinalHero={false} />
    </div>
  );
}
