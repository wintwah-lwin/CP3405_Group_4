import fs from 'fs';
import path from 'path';
import { getEvidenceConfig } from './githubSync';
import { getProjectWeek } from './projectWeek';
import {
  evidenceFolderPath,
  evidencePathsForProjectWeek,
  folderAndFileWeekToProjectWeek,
  LEGACY_W6_FOLDER,
  projectWeekToEvidenceTarget,
} from './weekMapping';
import type { PipelineAgentId } from './pythonPipeline';

export type EvidenceAgentId = Exclude<PipelineAgentId, 'fetch'>;

/** Public group repo — evidence is read without a token when repo is public */
export const DEFAULT_EVIDENCE_REPO = 'wintwah-lwin/CP3405_Group_4';
export const DEFAULT_EVIDENCE_BRANCH = 'main';

const REPORT_CANDIDATES: Record<EvidenceAgentId, (week: number) => string[]> = {
  almanac: (week) => [`almanac_agent_2026-W${week}.md`],
  macro: (week) => [`macro_report_w${week}.md`, `macro_agent_data_W${week}.md`],
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

export interface EvidenceReport {
  filename: string;
  markdown: string;
  source: 'public_github' | 'github' | 'local_repo' | 'scripts_output';
  repoPath: string;
  extras?: Record<string, string>;
}

function getRepoRef(): { owner: string; repo: string; branch: string } {
  const config = getEvidenceConfig();
  const full = config.githubRepo || DEFAULT_EVIDENCE_REPO;
  const [owner, repo] = full.split('/');
  const branch = process.env.GITHUB_EVIDENCE_BRANCH?.trim() || DEFAULT_EVIDENCE_BRANCH;
  return { owner, repo, branch };
}

function decodeGitHubContent(content: string, encoding: string): string {
  if (encoding === 'base64') {
    return Buffer.from(content.replace(/\n/g, ''), 'base64').toString('utf8');
  }
  return content;
}

/** Public repos: no token required */
async function fetchPublicRaw(repoPath: string): Promise<string | null> {
  const { owner, repo, branch } = getRepoRef();
  const segments = repoPath.split('/').map(encodeURIComponent).join('/');
  const url = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${segments}`;

  const res = await fetch(url, {
    headers: { Accept: 'text/plain' },
  });

  if (res.status === 404) return null;
  if (!res.ok) return null;
  return res.text();
}

async function fetchFromGitHubApi(repoPath: string): Promise<string | null> {
  const { owner, repo } = getRepoRef();
  const token = process.env.GITHUB_TOKEN?.trim();
  const encodedPath = repoPath.split('/').map(encodeURIComponent).join('/');
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${encodedPath}`;

  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(url, { headers });
  if (res.status === 404) return null;
  if (!res.ok) return null;

  const data = (await res.json()) as { content?: string; encoding?: string };
  if (!data.content) return null;
  return decodeGitHubContent(data.content, data.encoding ?? 'base64');
}

function readFromLocalRepo(repoRoot: string, repoPath: string): string | null {
  const fullPath = path.join(repoRoot, repoPath);
  if (!fs.existsSync(fullPath)) return null;
  return fs.readFileSync(fullPath, 'utf8');
}

async function readEvidenceFile(repoPath: string): Promise<{ content: string; source: EvidenceReport['source'] } | null> {
  const config = getEvidenceConfig();

  if (config.localPathConfigured && config.localPath) {
    const local = readFromLocalRepo(config.localPath, repoPath);
    if (local) return { content: local, source: 'local_repo' };
  }

  const fromRaw = await fetchPublicRaw(repoPath);
  if (fromRaw) return { content: fromRaw, source: 'public_github' };

  const token = process.env.GITHUB_TOKEN?.trim();
  if (token) {
    const fromApi = await fetchFromGitHubApi(repoPath);
    if (fromApi) return { content: fromApi, source: 'github' };
  } else {
    const fromApi = await fetchFromGitHubApi(repoPath);
    if (fromApi) return { content: fromApi, source: 'public_github' };
  }

  return null;
}

export async function readEvidenceAgentReport(
  agentId: EvidenceAgentId,
  projectWeek: number
): Promise<EvidenceReport | null> {
  const { folder, fileWeek } = projectWeekToEvidenceTarget(projectWeek);
  const weekFolder = evidenceFolderPath(folder);
  const filenames = REPORT_CANDIDATES[agentId](fileWeek);

  for (const filename of filenames) {
    const candidatePaths = [
      `${weekFolder}/${filename}`,
      ...(projectWeek === 6 ? [`${evidenceFolderPath(LEGACY_W6_FOLDER)}/${filename}`] : []),
    ];

    for (const repoPath of candidatePaths) {
      const file = await readEvidenceFile(repoPath);
      if (!file) continue;

      const extras: Record<string, string> = {};
      let source = file.source;

      for (const extraName of EXTRA_CANDIDATES[agentId]?.(fileWeek) ?? []) {
        const extraPaths = [
          `${weekFolder}/${extraName}`,
          ...(projectWeek === 6 ? [`${evidenceFolderPath(LEGACY_W6_FOLDER)}/${extraName}`] : []),
        ];
        for (const extraPath of extraPaths) {
          const extra = await readEvidenceFile(extraPath);
          if (extra) {
            extras[extraName] = extra.content;
            source = extra.source;
            break;
          }
        }
      }

      return {
        filename,
        markdown: file.content,
        source,
        repoPath,
        extras: Object.keys(extras).length ? extras : undefined,
      };
    }
  }

  return null;
}

async function weekHasEvidence(projectWeek: number): Promise<boolean> {
  const { fileWeek } = projectWeekToEvidenceTarget(projectWeek);
  const filename = `almanac_agent_2026-W${fileWeek}.md`;

  for (const repoPath of evidencePathsForProjectWeek(projectWeek, filename)) {
    const content = await fetchPublicRaw(repoPath);
    if (content) return true;
  }
  return false;
}

async function detectProjectWeekForFolder(folder: number): Promise<number | null> {
  for (const fileWeek of [folder, folder - 1, 6]) {
    const repoPath = `${evidenceFolderPath(folder)}/almanac_agent_2026-W${fileWeek}.md`;
    const content = await fetchPublicRaw(repoPath);
    if (content) return folderAndFileWeekToProjectWeek(folder, fileWeek);
  }
  return null;
}

export async function listEvidenceWeeks(): Promise<number[]> {
  const config = getEvidenceConfig();
  const folderNums = new Set<number>();

  if (config.localPathConfigured && config.localPath) {
    const evidenceDir = path.join(config.localPath, 'evidence');
    if (fs.existsSync(evidenceDir)) {
      for (const entry of fs.readdirSync(evidenceDir)) {
        const match = entry.match(/^Week (\d+)$/);
        if (match) folderNums.add(Number(match[1]));
      }
    }
  }

  const { owner, repo } = getRepoRef();
  const token = process.env.GITHUB_TOKEN?.trim();
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/evidence`;
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(url, { headers });
  if (res.ok) {
    const entries = (await res.json()) as { name: string }[];
    for (const entry of entries) {
      const match = entry.name.match(/^Week (\d+)$/);
      if (match) folderNums.add(Number(match[1]));
    }
  }

  const projectWeeks = new Set<number>();

  if (folderNums.size === 0) {
    return probeEvidenceWeeks();
  }

  await Promise.all(
    [...folderNums].map(async (folder) => {
      const projectWeek = await detectProjectWeekForFolder(folder);
      if (projectWeek) projectWeeks.add(projectWeek);
    })
  );

  for (let week = 1; week <= getProjectWeek() + 1; week += 1) {
    if (await weekHasEvidence(week)) projectWeeks.add(week);
  }

  return [...projectWeeks].sort((a, b) => b - a);
}

async function probeEvidenceWeeks(maxWeek?: number): Promise<number[]> {
  const upper = maxWeek ?? getProjectWeek() + 2;
  const found: number[] = [];

  await Promise.all(
    Array.from({ length: upper }, (_, index) => index + 1).map(async (week) => {
      if (await weekHasEvidence(week)) found.push(week);
    })
  );

  return found.sort((a, b) => b - a);
}

export async function findLatestWeekWithEvidence(fromWeek?: number): Promise<number> {
  const start = fromWeek ?? getProjectWeek();
  for (let week = start; week >= 1; week -= 1) {
    if (await weekHasEvidence(week)) return week;
  }
  return Math.max(1, start - 1);
}

export async function getDefaultEvidenceWeek(availableWeeks: number[]): Promise<number> {
  const latestPipelineWeek = await findLatestWeekWithEvidence();
  if (availableWeeks.includes(latestPipelineWeek)) return latestPipelineWeek;

  const projectWeek = getProjectWeek();
  const nearCurrent = availableWeeks
    .filter((week) => week <= projectWeek)
    .sort((a, b) => b - a)[0];

  return nearCurrent ?? latestPipelineWeek;
}
