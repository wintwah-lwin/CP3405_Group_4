export type AgentType = 'almanac' | 'macro' | 'technical';
export type AgentStatus = 'idle' | 'running' | 'completed' | 'error';

export interface Agent {
  id: AgentType;
  name: string;
  description: string;
  status: AgentStatus;
  lastRun?: string | null;
  summary?: string | null;
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

export interface MacroCommodityItem {
  name: string;
  price: string;
  weeklyChange: string;
  direction: string;
}

export interface MacroCalendarItem {
  date: string;
  event: string;
  expected: string;
  previous: string;
  importance: string;
}

export interface MacroEarningsItem {
  company: string;
  date: string;
  sector: string;
  watch: string;
}

export interface MacroNewsItem {
  headline: string;
  source: string;
  date: string;
  implication: string;
}

export interface MacroReport {
  weekOf: string;
  source: string;
  fedRates: {
    currentRate: string;
    nextFomcDate: string;
    holdProb: string;
    hikeProb: string;
    cutProb: string;
    directionVsLastWeek: string;
    yield2y: string;
    yield10y: string;
    yield30y: string;
    yieldCurve: string;
    yield10yDirection: string;
    implication: string;
  };
  commodities: {
    items: MacroCommodityItem[];
    crossAssetImplication: string;
  };
  calendar: MacroCalendarItem[];
  calendarKeyInsight: string;
  earnings: MacroEarningsItem[];
  earningsKeyInsight: string;
  news: MacroNewsItem[];
  newsKeyInsight: string;
  macroBias: string;
  primaryDriver: string;
  confidence: string;
  invalidation: string;
  sourcesAccessed: string;
}

export interface MacroReportResponse {
  report: MacroReport | null;
  savedAt?: string;
  runId?: string;
}

export interface MacroEvidence {
  commodities: (MacroCommodityItem & { symbol?: string; fromDataCollection?: boolean })[];
  calendar: (MacroCalendarItem & { fromDataCollection?: boolean })[];
  sectors: (MacroSectorItem & { fromDataCollection?: boolean })[];
  finvizCollectedAt: string | null;
  finvizTimeframe: string | null;
  calendarCollectedAt: string | null;
  sectorsCollectedAt: string | null;
}

export interface MacroSectorItem {
  symbol: string;
  name: string;
  price: string;
  dayReturn: string;
  direction: string;
}

export interface EvidenceSyncResult {
  method: 'github' | 'local' | 'skipped';
  week: number;
  files: string[];
  commitUrl?: string;
  message: string;
}

export interface EvidenceStatus {
  githubConfigured: boolean;
  localPathConfigured: boolean;
  githubRepo: string;
  localPath: string | null;
  defaultWeek: number;
  autoSync: boolean;
  pythonAvailable: boolean;
  groupRepo: string;
}
