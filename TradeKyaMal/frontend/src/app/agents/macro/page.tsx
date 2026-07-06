import { PageHeader } from '@/components/PageHeader';
import { MacroAgentReport } from '@/components/MacroAgentReport';

export default function MacroAgentPage() {
  return (
    <div>
      <PageHeader
        title="Macro Agent"
        description="Live market snapshot from Finviz futures and Yahoo sectors — refreshed from the web."
      />
      <MacroAgentReport />
    </div>
  );
}
