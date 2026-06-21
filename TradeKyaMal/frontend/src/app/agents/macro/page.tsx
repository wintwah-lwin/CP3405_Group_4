import { PageHeader } from '@/components/PageHeader';
import { MacroAgentReport } from '@/components/MacroAgentReport';

export default function MacroAgentPage() {
  return (
    <div>
      <PageHeader
        title="Macro Agent"
        description="Weekly macro report — rates, commodities, calendar, earnings, news, and market bias."
      />
      <MacroAgentReport />
    </div>
  );
}
