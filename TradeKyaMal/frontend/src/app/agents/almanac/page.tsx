import { PageHeader } from '@/components/PageHeader';
import { AgentPlaceholder } from '@/components/AgentPlaceholder';

export default function AlmanacAgentPage() {
  return (
    <div>
      <PageHeader
        title="Almanac Agent"
        description="Seasonal and calendar-based trading pattern analysis."
      />
      <AgentPlaceholder agentId="almanac" />
    </div>
  );
}
