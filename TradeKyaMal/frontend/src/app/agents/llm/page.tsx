import { PageHeader } from '@/components/PageHeader';
import { AgentWeekDashboard } from '@/components/AgentWeekDashboard';

export default function LlmIntegrationPage() {
  return (
    <div>
      <PageHeader title="LLM Integration" description="LLM synthesis, final prediction, and agreement matrix." />
      <AgentWeekDashboard agentFilter={['llm', 'final']} showFinalHero />
    </div>
  );
}
