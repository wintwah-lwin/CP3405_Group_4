export type AgentType = 'almanac' | 'macro' | 'technical';
export type AgentStatus = 'idle' | 'running' | 'completed' | 'error';

export interface Agent {
  id: AgentType;
  name: string;
  description: string;
  status: AgentStatus;
  lastRun?: string | null;
}

export type DataSourceType =
  | 'market_price'
  | 'economic_indicator'
  | 'news_sentiment'
  | 'technical_indicator'
  | 'custom';

export interface DataCollectionEntry {
  _id: string;
  symbol: string;
  source: DataSourceType;
  label: string;
  value: string | number;
  metadata?: Record<string, unknown>;
  collectedAt: string;
  createdAt?: string;
}

export interface DashboardStats {
  totalDataPoints: number;
  activeSymbols: number;
  lastCollection: string | null;
  agentCount: number;
}

export interface MarketQuote {
  symbol: string;
  price: number | null;
  change: number | null;
  changePercent: number | null;
  message?: string;
  timestamp: string;
}
