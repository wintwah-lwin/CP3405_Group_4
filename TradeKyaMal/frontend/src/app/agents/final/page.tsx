import { PageHeader } from '@/components/PageHeader';
import { AgentWeekDashboard } from '@/components/AgentWeekDashboard';

export default function FinalPredictionPage() {
  return (
    <div>
      <PageHeader title="Final Prediction" />
      <AgentWeekDashboard agentFilter="final" view="agent" />
    </div>
  );
}
