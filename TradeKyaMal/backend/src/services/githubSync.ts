import fs from 'fs';
import path from 'path';
import type { EvidenceFile } from './evidenceExport';

export interface SyncResult {
  method: 'github' | 'local' | 'skipped';
  week: number;
  files: string[];
  commitUrl?: string;
  message: string;
}

function parseRepo(repo: string): { owner: string; repo: string } {
  const [owner, name] = repo.split('/');
  if (!owner || !name) {
    throw new Error(`Invalid GITHUB_REPO format: ${repo}. Use owner/repo`);
  }
  return { owner, repo: name };
}

async function getFileSha(
  owner: string,
  repo: string,
  filePath: string,
  token: string
): Promise<string | null> {
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GitHub GET ${filePath} failed (${res.status}): ${body}`);
  }
  const data = (await res.json()) as { sha?: string };
  return data.sha ?? null;
}

async function putFile(
  owner: string,
  repo: string,
  filePath: string,
  content: string,
  message: string,
  token: string
): Promise<void> {
  const sha = await getFileSha(owner, repo, filePath, token);
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    body: JSON.stringify({
      message,
      content: Buffer.from(content, 'utf8').toString('base64'),
      ...(sha ? { sha } : {}),
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GitHub PUT ${filePath} failed (${res.status}): ${body}`);
  }
}

function syncToLocalRepo(
  repoPath: string,
  week: number,
  files: EvidenceFile[]
): string[] {
  const weekDir = path.join(repoPath, 'evidence', `Week ${week}`);
  const incomingDir = path.join(repoPath, 'incoming');
  fs.mkdirSync(weekDir, { recursive: true });
  fs.mkdirSync(incomingDir, { recursive: true });

  const written: string[] = [];
  for (const file of files) {
    const dest = path.join(repoPath, file.repoPath);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, file.content, 'utf8');
    fs.writeFileSync(path.join(incomingDir, file.name), file.content, 'utf8');
    written.push(file.repoPath);
  }
  return written;
}

export function getEvidenceConfig() {
  const token = process.env.GITHUB_TOKEN?.trim();
  const repo = process.env.GITHUB_REPO?.trim() || 'wintwah-lwin/CP3405_Group_4';
  const localPath = process.env.LOCAL_GROUP_REPO_PATH?.trim();
  const week = process.env.EVIDENCE_WEEK
    ? Number(process.env.EVIDENCE_WEEK)
    : 24;

  return {
    githubConfigured: Boolean(token && repo),
    localPathConfigured: Boolean(localPath && fs.existsSync(localPath)),
    githubRepo: repo,
    localPath: localPath ?? null,
    defaultWeek: week,
    autoSync: process.env.AUTO_SYNC_EVIDENCE !== 'false',
  };
}

export async function syncEvidenceFiles(
  week: number,
  files: EvidenceFile[],
  source = 'website'
): Promise<SyncResult> {
  if (files.length === 0) {
    return {
      method: 'skipped',
      week,
      files: [],
      message: 'No evidence files to sync — fetch data first',
    };
  }

  const config = getEvidenceConfig();
  const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
  const commitMessage = `chore(data): weekly fetch W${week} — ${source} (${stamp})`;

  if (config.localPathConfigured && config.localPath) {
    const written = syncToLocalRepo(config.localPath, week, files);
    return {
      method: 'local',
      week,
      files: written,
      message: `Wrote ${written.length} file(s) to ${config.localPath}`,
    };
  }

  if (config.githubConfigured && process.env.GITHUB_TOKEN) {
    const { owner, repo } = parseRepo(config.githubRepo);
    const token = process.env.GITHUB_TOKEN;
    const paths: string[] = [];

    for (const file of files) {
      await putFile(owner, repo, file.repoPath, file.content, commitMessage, token);
      paths.push(file.repoPath);
      await putFile(
        owner,
        repo,
        `incoming/${file.name}`,
        file.content,
        commitMessage,
        token
      );
      paths.push(`incoming/${file.name}`);
    }

    return {
      method: 'github',
      week,
      files: paths,
      commitUrl: `https://github.com/${owner}/${repo}/tree/main/evidence/Week%20${week}`,
      message: `Pushed ${files.length} file(s) to ${config.githubRepo}`,
    };
  }

  return {
    method: 'skipped',
    week,
    files: [],
    message:
      'Group repo sync not configured. Set GITHUB_TOKEN + GITHUB_REPO or LOCAL_GROUP_REPO_PATH in backend/.env',
  };
}
