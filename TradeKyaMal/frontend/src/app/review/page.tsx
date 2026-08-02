import { PageHeader } from '@/components/PageHeader';
import { AgentWeekDashboard } from '@/components/AgentWeekDashboard';

export default function ReviewPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Team Review" />
      <AgentWeekDashboard view="review" />
    </div>
  );
}
