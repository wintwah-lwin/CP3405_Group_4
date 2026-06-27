import { PageHeader } from '@/components/PageHeader';
import { MacroAgentReport } from '@/components/MacroAgentReport';
import { MacroAutomationPanel } from '@/components/MacroAutomationPanel';

export default function MacroAgentPage() {
  return (
    <div>
      <PageHeader
        title="Macro Agent"
        description="Live fetch from Finviz + Yahoo — no fake data. Edit Fed, news, and bias manually."
      />
      <div className="mb-6">
        <MacroAutomationPanel />
      </div>
      <MacroAgentReport />
    </div>
  );
}
