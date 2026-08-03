import { PageHeader } from '@/components/PageHeader';
import { AgentWeekDashboard } from '@/components/AgentWeekDashboard';

export default function HumanScorePage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Human Score" />
      <AgentWeekDashboard view="human-score" />
    </div>
  );
}
