import { PageHeader } from '@/components/PageHeader';
import { AgentPlaceholder } from '@/components/AgentPlaceholder';

export default function TechnicalAgentPage() {
  return (
    <div>
      <PageHeader
        title="Technical Agent"
        description="Technical indicator and price action signal generation."
      />
      <AgentPlaceholder agentId="technical" />
    </div>
  );
}
