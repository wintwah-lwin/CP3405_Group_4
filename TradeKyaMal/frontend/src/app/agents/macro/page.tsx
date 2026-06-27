import { PageHeader } from '@/components/PageHeader';
import { MacroAgentReport } from '@/components/MacroAgentReport';
import { MacroAutomationPanel } from '@/components/MacroAutomationPanel';

export default function MacroAgentPage() {
  return (
    <div>
      <PageHeader
        title="Macro Agent"
        description="Automated yfinance + Finviz fetch, weekly report, and evidence sync to the group GitHub repo."
      />
      <div className="mb-6">
        <MacroAutomationPanel />
      </div>
      <MacroAgentReport />
    </div>
  );
}
