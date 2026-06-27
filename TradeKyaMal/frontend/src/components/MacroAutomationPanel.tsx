'use client';

import { useEffect, useState } from 'react';
import {
  Play,
  Loader2,
  FolderGit2,
  CheckCircle2,
  AlertCircle,
  Terminal,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import type { EvidenceStatus, EvidenceSyncResult } from '@/lib/types';

interface RunPipelineResponse {
  week: number;
  imported: number;
  sync: EvidenceSyncResult;
  files: string[];
  pipeline?: { message: string; stdout: string };
}

interface SyncResponse {
  week: number;
  fileCount: number;
  sync: EvidenceSyncResult;
  files: string[];
}

export function MacroAutomationPanel() {
  const [status, setStatus] = useState<EvidenceStatus | null>(null);
  const [week, setWeek] = useState(24);
  const [running, setRunning] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState('');
  const [error, setError] = useState('');
  const [lastSync, setLastSync] = useState<EvidenceSyncResult | null>(null);

  useEffect(() => {
    apiFetch<EvidenceStatus>('/api/evidence/status')
      .then((data) => {
        setStatus(data);
        setWeek(data.defaultWeek);
      })
      .catch(() => setStatus(null));
  }, []);

  async function handleRunPipeline() {
    setRunning(true);
    setError('');
    setResult('');
    try {
      const data = await apiFetch<RunPipelineResponse>('/api/evidence/run', {
        method: 'POST',
        body: JSON.stringify({ week }),
      });
      setLastSync(data.sync);
      setResult(
        `Imported ${data.imported} rows · ${data.files.length} evidence file(s) · ${data.sync.message}`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Pipeline failed');
    } finally {
      setRunning(false);
    }
  }

  async function handleSyncToRepo() {
    setSyncing(true);
    setError('');
    setResult('');
    try {
      const data = await apiFetch<SyncResponse>('/api/evidence/sync', {
        method: 'POST',
        body: JSON.stringify({ week }),
      });
      setLastSync(data.sync);
      setResult(data.sync.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync failed');
    } finally {
      setSyncing(false);
    }
  }

  const repoReady = status?.githubConfigured || status?.localPathConfigured;

  return (
    <div className="rounded-xl border border-border-subtle bg-surface-raised p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">Macro Data Automation</h3>
          <p className="mt-1 text-xs text-text-muted">
            Run Python (yfinance + Finviz) → import to website → push to group repo{' '}
            <code className="text-[10px]">evidence/Week {week}/</code>
          </p>
        </div>
        <Terminal className="h-4 w-4 shrink-0 text-text-muted" />
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs text-text-secondary">Week</label>
          <input
            type="number"
            min={1}
            max={53}
            value={week}
            onChange={(e) => setWeek(Number(e.target.value))}
            className="w-20 rounded-lg border border-border-subtle bg-surface px-2 py-1.5 text-sm"
          />
        </div>

        <button
          type="button"
          onClick={handleRunPipeline}
          disabled={running || !status?.pythonAvailable}
          className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {running ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Play className="h-4 w-4" />
          )}
          Run Python Fetch
        </button>

        <button
          type="button"
          onClick={handleSyncToRepo}
          disabled={syncing || !repoReady}
          className="flex items-center gap-2 rounded-lg border border-border-subtle bg-surface px-4 py-2 text-sm text-text-secondary hover:border-accent disabled:opacity-50"
        >
          {syncing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <FolderGit2 className="h-4 w-4" />
          )}
          Sync to Group Repo
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-3 text-[11px]">
        {status?.pythonAvailable ? (
          <span className="flex items-center gap-1 text-positive">
            <CheckCircle2 className="h-3.5 w-3.5" /> Python scripts available
          </span>
        ) : (
          <span className="flex items-center gap-1 text-warning">
            <AlertCircle className="h-3.5 w-3.5" /> Python not on server — run locally
          </span>
        )}
        {repoReady ? (
          <span className="flex items-center gap-1 text-positive">
            <CheckCircle2 className="h-3.5 w-3.5" /> Group repo:{' '}
            {status?.githubConfigured ? status.groupRepo : status?.localPath}
          </span>
        ) : (
          <span className="flex items-center gap-1 text-warning">
            <AlertCircle className="h-3.5 w-3.5" /> Set GITHUB_TOKEN or LOCAL_GROUP_REPO_PATH
          </span>
        )}
        {status?.autoSync && (
          <span className="text-text-muted">Auto-sync on website fetch: on</span>
        )}
      </div>

      {!status?.pythonAvailable && (
        <p className="mt-3 rounded-lg border border-border-subtle bg-surface px-3 py-2 font-mono text-[11px] text-text-muted">
          cd scripts && python3 run_macro_agent.py --week {week} --backend-url
          http://localhost:4000
        </p>
      )}

      {error && (
        <p className="mt-3 text-xs text-negative">{error}</p>
      )}
      {result && (
        <p className="mt-3 text-xs text-positive">{result}</p>
      )}
      {lastSync?.commitUrl && (
        <a
          href={lastSync.commitUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-block text-xs text-accent hover:underline"
        >
          View evidence folder on GitHub →
        </a>
      )}
    </div>
  );
}
