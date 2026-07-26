export type AgentType = 'almanac' | 'macro' | 'technical' | 'llm' | 'final';
export type AgentStatus = 'idle' | 'running' | 'completed' | 'error';

export interface Agent {
  id: AgentType;
  name: string;
  description: string;
  status: AgentStatus;
  lastRun?: string | null;
  summary?: string | null;
  week?: number | null;
  scriptAvailable?: boolean;
}

export interface AgentPipelineReport {
  filename: string;
  markdown: string;
  bias?: string;
  repoPath?: string;
  extras?: Record<string, string>;
}

export interface AgentReportResponse {
  week: number;
  source?: 'scripts_output' | 'public_github' | 'github' | 'local_repo';
  report: AgentPipelineReport | null;
  availableWeeks?: number[];
  message?: string;
}

export interface AgentRunResponse {
  week: number;
  runId?: string;
  bias?: string | null;
  report?: {
    filename: string;
    markdown: string;
    extras?: Record<string, string>;
  } | null;
  pipeline?: {
    message: string;
    stdout: string;
  };
}

export interface PipelineStatus {
  pythonAvailable: boolean;
  projectWeek: number;
  defaultWeek: number;
  availableWeeks?: number[];
  githubConfigured: boolean;
  evidenceRepo: string;
  canRunAgentsOnServer: boolean;
  canViewEvidenceFromGitHub: boolean;
  evidenceSource?: string;
  agents: { id: string; scriptAvailable: boolean }[];
}

export interface EvidenceFileEntry {
  name: string;
  path: string;
  type: 'file' | 'dir';
  size?: number;
  downloadUrl?: string;
}

export interface EvidenceCommitInfo {
  message: string;
  date: string;
}

export interface AgentWeekSummary {
  id: AgentType;
  label: string;
  bias: string | null;
  confidence: string | null;
  reportMarkdown: string | null;
}

export interface WeekDashboardData {
  week: number;
  availableWeeks: number[];
  updatedAt: string | null;
  finalBias: string | null;
  finalConfidence: string | null;
  modelScore: string | null;
  agents: AgentWeekSummary[];
  sourceRows: Array<{ source: string; bias: string; confidence: string; driver?: string }>;
  indexRows: Array<{ asset: string; change: string; signal: string }>;
  sectors: Array<{ name: string; symbol: string; pct: number }>;
  technicalCharts: Array<{ label: string; url: string }>;
  macroCharts: Array<{ label: string; url: string }>;
  risks: string[];
  agreementMarkdown: string | null;
  calibrationLog: string | null;
  learningLog: string | null;
  llmHorserace: string | null;
  pastAccuracyLog: string | null;
  humanScoreMarkdown: string | null;
}

export interface HumanScoreSection {
  aiScore: number;
  teamScore: number;
  notes: string;
}

export interface HumanScoreData {
  week: number;
  macro: HumanScoreSection;
  technical: HumanScoreSection;
  almanac: HumanScoreSection;
  llmConsensus: HumanScoreSection;
  finalBias: string;
  confidence: string;
  markdown?: string;
  updatedAt?: string;
  source?: 'saved' | 'github';
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
  futures: MacroFutureItem[];
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

export interface MacroFutureItem {
  ticker: string;
  label: string;
  group: string;
  weeklyChange: string;
  direction: string;
  value: number;
}

export interface MacroFetchLiveResponse {
  fetch: {
    finviz: number;
    sectors: number;
    calendar: number;
    errors: string[];
  };
  evidence: MacroEvidence;
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
