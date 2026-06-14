import { PageHeader } from '@/components/PageHeader';
import { AgentPlaceholder } from '@/components/AgentPlaceholder';

export default function MacroAgentPage() {
  return (
    <div>
      <PageHeader
        title="Macro Agent"
        description="Macroeconomic data monitoring and global market context."
      />
      <AgentPlaceholder agentId="macro" />
    </div>
  );
}
