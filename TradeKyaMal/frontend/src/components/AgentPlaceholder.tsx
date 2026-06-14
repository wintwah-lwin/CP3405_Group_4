import { Calendar, BarChart3, TrendingUp, Construction } from 'lucide-react';
import type { AgentType } from '@/lib/types';

const agentConfig: Record<
  AgentType,
  { name: string; description: string; icon: typeof Calendar; features: string[] }
> = {
  almanac: {
    name: 'Almanac Agent',
    description:
      'Analyses seasonal patterns, earnings calendars, and historical date-based market behaviour.',
    icon: Calendar,
    features: [
      'Seasonal trend detection',
      'Earnings & event calendar integration',
      'Historical same-period comparisons',
      'Holiday and cycle pattern alerts',
    ],
  },
  macro: {
    name: 'Macro Agent',
    description:
      'Monitors macroeconomic data — rates, inflation, GDP, and global market sentiment.',
    icon: BarChart3,
    features: [
      'Interest rate & CPI tracking',
      'Central bank policy signals',
      'Cross-asset correlation analysis',
      'Geopolitical risk scoring',
    ],
  },
  technical: {
    name: 'Technical Agent',
    description:
      'Generates signals from price action, volume, and technical indicators.',
    icon: TrendingUp,
    features: [
      'Moving average crossovers',
      'RSI, MACD, and momentum signals',
      'Support & resistance levels',
      'Volume profile analysis',
    ],
  },
};

interface AgentPlaceholderProps {
  agentId: AgentType;
}

export function AgentPlaceholder({ agentId }: AgentPlaceholderProps) {
  const config = agentConfig[agentId];
  const Icon = config.icon;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border-subtle bg-surface-raised p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-overlay">
            <Icon className="h-6 w-6 text-text-secondary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">{config.name}</h2>
            <p className="mt-1 max-w-xl text-sm text-text-secondary">
              {config.description}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {config.features.map((feature) => (
          <div
            key={feature}
            className="rounded-lg border border-border-subtle bg-surface-raised px-4 py-3 text-sm text-text-secondary"
          >
            {feature}
          </div>
        ))}
      </div>

      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface-raised py-16">
        <Construction className="h-8 w-8 text-text-muted" />
        <p className="mt-4 text-sm font-medium text-text-secondary">
          Agent module coming soon
        </p>
        <p className="mt-1 max-w-sm text-center text-xs text-text-muted">
          This agent will connect to the data collection layer and produce
          trading signals. Configure data sources first, then wire the agent
          logic here.
        </p>
      </div>
    </div>
  );
}
