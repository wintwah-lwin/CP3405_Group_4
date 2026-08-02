import { PageHeader } from '@/components/PageHeader';
import { AgentWeekDashboard } from '@/components/AgentWeekDashboard';

export default function TechnicalAgentPage() {
  return (
    <div>
      <PageHeader title="Technical Agent" description="Weekly bias, charts, and report." />
      <AgentWeekDashboard agentFilter="technical" showFinalHero={false} />
    </div>
  );
}
