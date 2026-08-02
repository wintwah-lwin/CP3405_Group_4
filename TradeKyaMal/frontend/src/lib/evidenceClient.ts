import {
  evidenceFolderPath,
  evidencePathsForProjectWeek,
  folderAndFileWeekToProjectWeek,
  LEGACY_W6_FOLDER,
  maxSelectableProjectWeek,
  parseFileWeekFromName,
  projectWeekToEvidenceTarget,
} from '@/lib/weekMapping';
import type {
  AgentReportResponse,
  AgentType,
  AgentWeekSummary,
  EvidenceCommitInfo,
  EvidenceFileEntry,
  PipelineStatus,
  WeekDashboardData,
} from '@/lib/types';

export const EVIDENCE_REPO = 'wintwah-lwin/CP3405_Group_4';
export const EVIDENCE_BRANCH = 'main';
const PROJECT_START = '2026-05-25';
const SINGAPORE_TZ = 'Asia/Singapore';

function getSingaporeDateParts(): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: SINGAPORE_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());

  const lookup = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  return { year: lookup('year'), month: lookup('month'), day: lookup('day') };
}

export function getProjectWeek(): number {
  const { year, month, day } = getSingaporeDateParts();
  const start = new Date(`${PROJECT_START}T00:00:00`);
  const now = new Date(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T00:00:00`);
  const days = Math.floor((now.getTime() - start.getTime()) / 86_400_000);
  // Week 1 starts on project start date; roll over after each 7-day block (SGT).
  return Math.max(1, Math.floor((days - 1) / 7) + 1);
}

const REPORT_CANDIDATES: Record<EvidenceAgentId, (week: number) => string[]> = {
  almanac: (week) => [`almanac_agent_2026-W${week}.md`],
  macro: (week) => [
    `macro_agent_2026-W${week}.md`,
    `macro_report_w${week}.md`,
    `macro_agent_data_W${week}.md`,
  ],
  technical: (week) => [`technical_agent_2026-W${week}.md`],
  llm: (week) => [`llm_integration_2026-W${week}.md`],
  final: (week) => [`final_prediction_2026-W${week}.md`],
};

const EXTRA_CANDIDATES: Partial<Record<EvidenceAgentId, (week: number) => string[]>> = {
  llm: (week) => [
    `agreement_matrix_2026-W${week}.md`,
    `llm_responses_2026-W${week}.json`,
  ],
};

export const AGENT_FILE_PATTERNS: Record<EvidenceAgentId, RegExp[]> = {
  almanac: [/^almanac_/i],
  macro: [/^macro_/i, /^finviz_/i, /^yahoo_/i],
  technical: [/^technical_/i],
  llm: [/^llm_/i, /^agreement_matrix/i],
  final: [/^final_prediction/i],
};

type EvidenceAgentId = AgentType;

function extractBiasFromMarkdown(markdown: string): string | null {
  const patterns = [
    /\*\*ALMANAC BIAS:\*\*\s*([^\n]+)/i,
    /\*\*MACRO BIAS:\*\*\s*([^\n]+)/i,
    /\*\*FINAL TECHNICAL BIAS:\*\*\s*([^\n]+)/i,
    /\*\*TECHNICAL BIAS:\*\*\s*([^\n]+)/i,
    /\*\*FINAL MARKET BIAS:\*\*\s*([^\n]+)/i,
    /(?:^|\n)#{1,3}\s*ALMANAC BIAS:\s*([^\n]+)/i,
    /(?:^|\n)#{1,3}\s*MACRO BIAS:\s*([^\n]+)/i,
    /(?:^|\n)#{1,3}\s*FINAL TECHNICAL BIAS:\s*([^\n]+)/i,
    /(?:^|\n)#{1,3}\s*TECHNICAL BIAS:\s*([^\n]+)/i,
    /(?:^|\n)#{1,3}\s*FINAL MARKET BIAS:\s*([^\n]+)/i,
    /Overall Market Bias:\s*([^\n]+)/i,
  ];

  for (const pattern of patterns) {
    const match = markdown.match(pattern);
    if (match?.[1]) {
      return match[1].replace(/\*/g, '').trim();
    }
  }
  return null;
}

function repoApiUrl(path: string): string {
  const [owner, repo] = EVIDENCE_REPO.split('/');
  const encoded = path.split('/').map(encodeURIComponent).join('/');
  return `https://api.github.com/repos/${owner}/${repo}/contents/${encoded}?ref=${EVIDENCE_BRANCH}`;
}

export function rawFileUrl(repoPath: string): string {
  const [owner, repo] = EVIDENCE_REPO.split('/');
  const segments = repoPath.split('/').map(encodeURIComponent).join('/');
  return `https://raw.githubusercontent.com/${owner}/${repo}/${EVIDENCE_BRANCH}/${segments}`;
}

async function fetchPublicRaw(repoPath: string): Promise<string | null> {
  const res = await fetch(rawFileUrl(repoPath), { headers: { Accept: 'text/plain' } });
  if (!res.ok) return null;
  return res.text();
}

async function weekHasEvidence(projectWeek: number): Promise<boolean> {
  const { fileWeek } = projectWeekToEvidenceTarget(projectWeek);
  const filename = `almanac_agent_2026-W${fileWeek}.md`;

  for (const path of evidencePathsForProjectWeek(projectWeek, filename)) {
    try {
      const res = await fetch(rawFileUrl(path), { method: 'HEAD' });
      if (res.ok) return true;
    } catch {
      // HEAD may fail on some networks — fall back to GET
    }
    const body = await fetchPublicRaw(path);
    if (body) return true;
  }
  return false;
}

async function probeEvidenceWeeks(maxWeek?: number): Promise<number[]> {
  const cap = maxSelectableProjectWeek(getProjectWeek());
  const upper = maxWeek ?? cap;
  const found: number[] = [];

  await Promise.all(
    Array.from({ length: upper }, (_, index) => index + 1).map(async (week) => {
      if (await weekHasEvidence(week)) found.push(week);
    })
  );

  return found.filter((week) => week <= cap).sort((a, b) => b - a);
}

async function listEvidenceFolderNumbers(): Promise<number[]> {
  const res = await fetch(repoApiUrl('evidence'), {
    headers: {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });

  if (!res.ok) return [];

  const entries = (await res.json()) as { name: string }[];
  return entries
    .map((entry) => {
      const match = entry.name.match(/^Week (\d+)$/);
      return match ? Number(match[1]) : null;
    })
    .filter((value): value is number => value !== null);
}

async function listFolderFiles(folder: number, subPath = ''): Promise<EvidenceFileEntry[]> {
  const folderPath = evidenceFolderPath(folder, subPath);
  const res = await fetch(repoApiUrl(folderPath), {
    headers: {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });

  if (!res.ok) return [];

  const entries = (await res.json()) as {
    name: string;
    path: string;
    type: 'file' | 'dir';
    size?: number;
    download_url?: string;
  }[];

  return entries.map((entry) => ({
    name: entry.name,
    path: entry.path,
    type: entry.type,
    size: entry.size,
    downloadUrl: entry.download_url,
  }));
}

async function detectProjectWeekForFolder(folder: number): Promise<number | null> {
  const files = await listFolderFiles(folder);
  const almanac = files.find((file) => /almanac_agent/i.test(file.name));
  if (almanac) {
    const fileWeek = parseFileWeekFromName(almanac.name);
    if (fileWeek) return folderAndFileWeekToProjectWeek(folder, fileWeek);
  }
  return null;
}

export async function findLatestWeekWithEvidence(fromWeek?: number): Promise<number> {
  const start = fromWeek ?? getProjectWeek();
  for (let week = start; week >= 1; week -= 1) {
    if (await weekHasEvidence(week)) return week;
  }
  return Math.max(1, start - 1);
}

export async function listEvidenceWeeks(): Promise<number[]> {
  const cap = maxSelectableProjectWeek(getProjectWeek());
  const folderNums = await listEvidenceFolderNumbers();
  const projectWeeks = new Set<number>();

  if (folderNums.length === 0) {
    return probeEvidenceWeeks();
  }

  await Promise.all(
    folderNums.map(async (folder) => {
      const projectWeek = await detectProjectWeekForFolder(folder);
      if (projectWeek && projectWeek <= cap) projectWeeks.add(projectWeek);
    })
  );

  for (let week = 1; week <= cap; week += 1) {
    if (await weekHasEvidence(week)) projectWeeks.add(week);
  }

  return [...projectWeeks]
    .filter((week) => week <= cap)
    .sort((a, b) => b - a);
}

export async function getDefaultEvidenceWeek(availableWeeks: number[]): Promise<number> {
  const projectWeek = getProjectWeek();

  if (availableWeeks.includes(projectWeek)) {
    return projectWeek;
  }

  const latestPipelineWeek = await findLatestWeekWithEvidence(projectWeek);
  if (availableWeeks.includes(latestPipelineWeek)) return latestPipelineWeek;

  return (
    availableWeeks
      .filter((week) => week <= projectWeek)
      .sort((a, b) => b - a)[0] ?? projectWeek
  );
}

export function weekFolderPath(projectWeek: number, subPath = ''): string {
  const { folder } = projectWeekToEvidenceTarget(projectWeek);
  return evidenceFolderPath(folder, subPath);
}

export async function listWeekEvidenceFiles(
  week: number,
  subPath = ''
): Promise<EvidenceFileEntry[]> {
  const folderPath = weekFolderPath(week, subPath);
  const res = await fetch(repoApiUrl(folderPath), {
    headers: {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });

  if (!res.ok) return [];

  const entries = (await res.json()) as {
    name: string;
    path: string;
    type: 'file' | 'dir';
    size?: number;
    download_url?: string;
  }[];

  return entries
    .map((entry) => ({
      name: entry.name,
      path: entry.path,
      type: entry.type,
      size: entry.size,
      downloadUrl: entry.download_url,
    }))
    .sort((a, b) => {
      if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
}

export async function getWeekPipelineCommit(week: number): Promise<EvidenceCommitInfo | null> {
  const [owner, repo] = EVIDENCE_REPO.split('/');
  const path = encodeURIComponent(weekFolderPath(week));
  const url = `https://api.github.com/repos/${owner}/${repo}/commits?path=${path}&per_page=1`;

  const res = await fetch(url, {
    headers: {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });

  if (!res.ok) return null;

  const commits = (await res.json()) as { commit: { message: string; author: { date: string } } }[];
  const latest = commits[0];
  if (!latest) return null;

  return {
    message: latest.commit.message.split('\n')[0],
    date: latest.commit.author.date,
  };
}

export function formatRelativeTime(isoDate: string): string {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const days = Math.floor(diffMs / 86_400_000);

  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  return new Date(isoDate).toLocaleDateString();
}

export function matchesAgentFilter(
  name: string,
  agentFilter?: AgentType | AgentType[]
): boolean {
  if (!agentFilter) return true;
  const filters = Array.isArray(agentFilter) ? agentFilter : [agentFilter];
  return filters.some((agent) =>
    AGENT_FILE_PATTERNS[agent].some((pattern) => pattern.test(name))
  );
}

export function fileKind(name: string): 'markdown' | 'json' | 'image' | 'other' {
  const lower = name.toLowerCase();
  if (lower.endsWith('.md')) return 'markdown';
  if (lower.endsWith('.json')) return 'json';
  if (/\.(png|jpg|jpeg|gif|webp|svg)$/.test(lower)) return 'image';
  return 'other';
}

export function cleanReportMarkdown(content: string): string {
  return content
    .split('\n')
    .filter((line) => {
      const trimmed = line.trim();
      if (/^>\s*this report is fully generated/i.test(trimmed)) return false;
      if (/^>\s*the .* agent combines/i.test(trimmed)) return false;
      return true;
    })
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export async function fetchEvidenceFileContent(path: string): Promise<string | null> {
  return fetchPublicRaw(path);
}

export async function fetchEvidenceReport(
  agentId: EvidenceAgentId,
  projectWeek: number
): Promise<AgentReportResponse> {
  const { folder, fileWeek } = projectWeekToEvidenceTarget(projectWeek);
  const weekFolder = evidenceFolderPath(folder);
  const filenames = REPORT_CANDIDATES[agentId];

  for (const filename of filenames(fileWeek)) {
    const repoPath = `${weekFolder}/${filename}`;
    let markdown = await fetchPublicRaw(repoPath);

    if (!markdown && projectWeek === 6 && folder === 6) {
      markdown = await fetchPublicRaw(`${evidenceFolderPath(LEGACY_W6_FOLDER)}/${filename}`);
    }

    if (!markdown) continue;

    const extras: Record<string, string> = {};
    for (const extraName of EXTRA_CANDIDATES[agentId]?.(fileWeek) ?? []) {
      const extraPath = `${weekFolder}/${extraName}`;
      let extra = await fetchPublicRaw(extraPath);
      if (!extra && projectWeek === 6) {
        extra = await fetchPublicRaw(`${evidenceFolderPath(LEGACY_W6_FOLDER)}/${extraName}`);
      }
      if (extra) extras[extraName] = extra;
    }

    return {
      week: projectWeek,
      source: 'public_github',
      report: {
        filename,
        markdown,
        bias: extractBiasFromMarkdown(markdown) ?? undefined,
        repoPath,
        extras: Object.keys(extras).length ? extras : undefined,
      },
    };
  }

  return {
    week: projectWeek,
    source: 'public_github',
    report: null,
    message: `No files for week ${projectWeek}.`,
  };
}

export async function fetchPipelineStatus(): Promise<PipelineStatus> {
  const availableWeeks = await listEvidenceWeeks();
  const defaultWeek = await getDefaultEvidenceWeek(availableWeeks);

  return {
    pythonAvailable: false,
    projectWeek: getProjectWeek(),
    defaultWeek,
    availableWeeks,
    githubConfigured: true,
    evidenceRepo: EVIDENCE_REPO,
    canRunAgentsOnServer: false,
    canViewEvidenceFromGitHub: true,
    evidenceSource: 'public_github',
    agents: ['almanac', 'macro', 'technical', 'llm', 'final'].map((id) => ({
      id,
      scriptAvailable: false,
    })),
  };
}

const AGENT_LABELS: Record<EvidenceAgentId, string> = {
  almanac: 'Almanac',
  macro: 'Macro',
  technical: 'Technical',
  llm: 'LLM',
  final: 'Final',
};

function parseMarkdownField(markdown: string, pattern: RegExp): string | null {
  const match = markdown.match(pattern);
  return match?.[1]?.replace(/\*/g, '').trim() ?? null;
}

function parseTableRow(line: string): string[] {
  return line
    .trim()
    .slice(1, -1)
    .split('|')
    .map((cell) => cell.trim());
}

function parseMarkdownTableAfterHeading(markdown: string, headingMatch: RegExp): string[][] {
  const lines = markdown.split('\n');
  let capture = false;
  const rows: string[][] = [];

  for (const line of lines) {
    if (line.startsWith('## ')) {
      capture = headingMatch.test(line);
      continue;
    }
    if (!capture || !line.trim().startsWith('|')) continue;
    if (/^\|\s*[-:]+/.test(line)) continue;
    rows.push(parseTableRow(line));
  }

  return rows;
}

function parseRiskBullets(markdown: string): string[] {
  const lines = markdown.split('\n');
  let capture = false;
  const risks: string[] = [];

  for (const line of lines) {
    if (/^## .*key risks/i.test(line)) {
      capture = true;
      continue;
    }
    if (capture && line.startsWith('## ')) break;
    if (capture && line.trim().startsWith('- ')) {
      risks.push(line.trim().slice(2).replace(/\*\*/g, ''));
    }
  }

  return risks.slice(0, 6);
}

async function fetchOptionalMarkdown(path: string): Promise<string | null> {
  const raw = await fetchPublicRaw(path);
  return raw ? cleanReportMarkdown(raw) : null;
}

export async function fetchCalibrationArtifacts(projectWeek: number): Promise<{
  calibrationLog: string | null;
  learningLog: string | null;
  llmHorserace: string | null;
  pastAccuracyLog: string | null;
  humanScoreMarkdown: string | null;
}> {
  const { folder, fileWeek } = projectWeekToEvidenceTarget(projectWeek);
  const weekFolder = evidenceFolderPath(folder);
  const legacyFolder = projectWeek === 6 ? evidenceFolderPath(LEGACY_W6_FOLDER) : null;

  async function firstMatch(paths: string[]): Promise<string | null> {
    for (const path of paths) {
      const content = await fetchOptionalMarkdown(path);
      if (content) return content;
    }
    return null;
  }

  const fileTag = `2026-W${fileWeek}`;

  const [
    calibrationLog,
    learningLog,
    llmHorserace,
    pastAccuracyWeek,
    pastAccuracyRoot,
    humanScoreMarkdown,
  ] = await Promise.all([
    firstMatch([
      `${weekFolder}/calibration_log_${fileTag}.md`,
      `${weekFolder}/calibration_log_W${fileWeek}.md`,
      `${weekFolder}/calibration_log.md`,
      ...(legacyFolder ? [`${legacyFolder}/calibration_log_${fileTag}.md`] : []),
      `evidence/calibration_log.md`,
    ]),
    firstMatch([
      `${weekFolder}/learning_log_${fileTag}.md`,
      `${weekFolder}/learning_log_W${fileWeek}.md`,
      `${weekFolder}/learning_log.md`,
      `evidence/learning_log_W${fileWeek}.md`,
    ]),
    firstMatch([
      `${weekFolder}/llm_horserace_${fileTag}.md`,
      `${weekFolder}/llm_horserace_W${fileWeek}.md`,
      `${weekFolder}/llm_horserace.md`,
      `evidence/llm_horserace.md`,
    ]),
    firstMatch([`${weekFolder}/past_accuracy_log.md`]),
    firstMatch([`evidence/past_accuracy_log.md`]),
    firstMatch([
      `${weekFolder}/human_score_${fileTag}.md`,
      `${weekFolder}/human_score_2026-W${projectWeek}.md`,
      ...(legacyFolder ? [`${legacyFolder}/human_score_${fileTag}.md`] : []),
      `evidence/human_score_${fileTag}.md`,
    ]),
  ]);

  return {
    calibrationLog,
    learningLog,
    llmHorserace,
    pastAccuracyLog: pastAccuracyWeek ?? pastAccuracyRoot ?? null,
    humanScoreMarkdown,
  };
}

function latestJsonFile(files: EvidenceFileEntry[], pattern: RegExp): EvidenceFileEntry | undefined {
  const dated = (name: string) => name.match(/(\d{4}-\d{2}-\d{2})/)?.[1] ?? '';

  return files
    .filter((file) => file.type === 'file' && pattern.test(file.name))
    .sort((a, b) => dated(b.name).localeCompare(dated(a.name)) || b.name.localeCompare(a.name))[0];
}

function chartLabel(name: string): string {
  if (/SPX/i.test(name)) return 'S&P 500';
  if (/NDX/i.test(name)) return 'Nasdaq';
  if (/IWM/i.test(name)) return 'Russell 2000';
  return name.replace(/\.[^.]+$/, '').replace(/_/g, ' ');
}

function visibleAgents(filter?: AgentType | AgentType[]): EvidenceAgentId[] {
  const all: EvidenceAgentId[] = ['almanac', 'macro', 'technical', 'llm', 'final'];
  if (!filter) return all;
  const filters = Array.isArray(filter) ? filter : [filter];
  return all.filter((id) => filters.includes(id));
}

export async function loadWeekDashboard(
  week: number,
  agentFilter?: AgentType | AgentType[]
): Promise<WeekDashboardData> {
  const [availableWeeks, commit, topFiles, macroChartFiles, calibration] = await Promise.all([
    listEvidenceWeeks(),
    getWeekPipelineCommit(week),
    listWeekEvidenceFiles(week),
    listWeekEvidenceFiles(week, 'macro_charts'),
    fetchCalibrationArtifacts(week),
  ]);

  const agentIds = visibleAgents(agentFilter);
  const agentReports = await Promise.all(
    agentIds.map(async (id) => {
      const report = await fetchEvidenceReport(id, week);
      return {
        id,
        label: AGENT_LABELS[id],
        bias: report.report?.bias ?? extractBiasFromMarkdown(report.report?.markdown ?? '') ?? null,
        confidence: parseMarkdownField(report.report?.markdown ?? '', /\*\*CONFIDENCE:\*\*\s*([^\n]+)/i),
        reportMarkdown: report.report?.markdown
          ? cleanReportMarkdown(report.report.markdown)
          : null,
      } satisfies AgentWeekSummary;
    })
  );

  const finalReport = await fetchEvidenceReport('final', week);
  const finalMarkdown = finalReport.report?.markdown ?? '';
  const llmReport = await fetchEvidenceReport('llm', week);
  const agreementKey = Object.keys(llmReport.report?.extras ?? {}).find((key) =>
    key.includes('agreement_matrix')
  );
  const agreementMarkdown = agreementKey
    ? cleanReportMarkdown(llmReport.report?.extras?.[agreementKey] ?? '')
    : null;

  const sectorFile = latestJsonFile(topFiles, /^macro_yahoo_sectors_/i)
    ?? latestJsonFile(topFiles, /^yahoo_sectors_/i);
  let sectors: WeekDashboardData['sectors'] = [];

  if (sectorFile) {
    const raw = await fetchPublicRaw(sectorFile.path);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Array<{
          name?: string;
          symbol?: string;
          day_return_pct?: number;
          week_return_pct?: number;
        }>;
        sectors = parsed
          .map((item) => ({
            name: item.name ?? item.symbol ?? 'Sector',
            symbol: item.symbol ?? '',
            pct: item.week_return_pct ?? item.day_return_pct ?? 0,
          }))
          .sort((a, b) => b.pct - a.pct);
      } catch {
        sectors = [];
      }
    }
  }

  const almanacMarkdown = agentReports.find((agent) => agent.id === 'almanac')?.reportMarkdown ?? '';
  const indexTable = parseMarkdownTableAfterHeading(
    almanacMarkdown,
    /fresh one-week market performance/i
  );
  const indexRows = indexTable.slice(0, 8).map((row) => ({
    asset: row[0] ?? '',
    change: row[1] ?? '',
    signal: row[2] ?? '',
  }));

  const sourceTable = parseMarkdownTableAfterHeading(finalMarkdown, /source summary/i);
  const sourceRows = sourceTable
    .filter((row) => row[0] && !/^total$/i.test(row[0]))
    .map((row) => ({
      source: row[0] ?? '',
      bias: row[1] ?? '',
      confidence: row[2] ?? '',
      driver: row[3],
    }));

  const technicalCharts = topFiles
    .filter((file) => file.type === 'file' && /^technical_.*\.png$/i.test(file.name))
    .map((file) => ({
      label: chartLabel(file.name),
      url: rawFileUrl(file.path),
    }));

  const macroCharts = macroChartFiles
    .filter((file) => file.type === 'file' && fileKind(file.name) === 'image')
    .map((file) => ({
      label: chartLabel(file.name),
      url: rawFileUrl(file.path),
    }));

  return {
    week,
    availableWeeks,
    updatedAt: commit?.date ?? null,
    finalBias:
      parseMarkdownField(finalMarkdown, /\*\*FINAL MARKET BIAS:\*\*\s*([^\n]+)/i) ??
      extractBiasFromMarkdown(finalMarkdown),
    finalConfidence: parseMarkdownField(finalMarkdown, /\*\*CONFIDENCE:\*\*\s*([^\n]+)/i),
    modelScore: parseMarkdownField(finalMarkdown, /\*\*MODEL SCORE:\*\*\s*([^\n]+)/i),
    agents: agentReports,
    sourceRows,
    indexRows,
    sectors,
    technicalCharts,
    macroCharts,
    risks: parseRiskBullets(finalMarkdown),
    agreementMarkdown,
    calibrationLog: calibration.calibrationLog,
    learningLog: calibration.learningLog,
    llmHorserace: calibration.llmHorserace,
    pastAccuracyLog: calibration.pastAccuracyLog,
    humanScoreMarkdown: calibration.humanScoreMarkdown,
  };
}
