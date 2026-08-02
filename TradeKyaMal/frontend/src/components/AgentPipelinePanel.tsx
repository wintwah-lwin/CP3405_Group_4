'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, Play, RefreshCw, Zap } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { fetchEvidenceReport, fetchPipelineStatus } from '@/lib/evidenceClient';
import { MarkdownContent } from '@/components/MarkdownContent';
import type { AgentPipelineReport, AgentReportResponse, AgentRunResponse, PipelineStatus } from '@/lib/types';

interface AgentPipelinePanelProps {
  agentId: 'almanac' | 'macro' | 'technical' | 'llm' | 'final';
  title: string;
  description: string;
  showFullPipeline?: boolean;
  children?: React.ReactNode;
}

const SOURCE_LABELS: Record<string, string> = {
  public_github: 'Live from group repo (CP3405_Group_4)',
  github: 'Loaded from group repo (GitHub)',
  local_repo: 'Loaded from local group repo',
  scripts_output: 'Loaded from server script output',
};

export function AgentPipelinePanel({
  agentId,
  title,
  description,
  showFullPipeline = true,
  children,
}: AgentPipelinePanelProps) {
  const [week, setWeek] = useState<number>(7);
  const [report, setReport] = useState<AgentPipelineReport | null>(null);
  const [agreement, setAgreement] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [runningAll, setRunningAll] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState<PipelineStatus | null>(null);
  const [reportSource, setReportSource] = useState<string>('');
  const [lastBias, setLastBias] = useState<string | null>(null);
  const [emptyMessage, setEmptyMessage] = useState('');
  const [availableWeeks, setAvailableWeeks] = useState<number[]>([]);

  const canRunOnServer = status?.canRunAgentsOnServer ?? false;
  const canViewFromGitHub = status?.canViewEvidenceFromGitHub ?? false;

  const loadStatus = useCallback(async () => {
    try {
      const data = await apiFetch<PipelineStatus>('/api/agents/pipeline/status');
      setStatus(data);
      setAvailableWeeks(data.availableWeeks ?? []);
      setWeek(data.defaultWeek);
    } catch {
      const fallback = await fetchPipelineStatus();
      setStatus(fallback);
      setAvailableWeeks(fallback.availableWeeks ?? []);
      setWeek(fallback.defaultWeek);
    }
  }, []);

  const loadReport = useCallback(async (targetWeek: number) => {
    setError('');
    try {
      let data: AgentReportResponse;
      try {
        data = await apiFetch<AgentReportResponse>(
          `/api/agents/pipeline/report/${agentId}?week=${targetWeek}`
        );
      } catch {
        data = await fetchEvidenceReport(agentId, targetWeek);
      }

      setReport(data.report);
      setLastBias(data.report?.bias ?? null);
      setReportSource(data.source ? SOURCE_LABELS[data.source] ?? data.source : '');
      setEmptyMessage(data.message ?? '');

      if (agentId === 'llm' && data.report?.extras) {
        const agreementKey = Object.keys(data.report.extras).find((k) =>
          k.includes('agreement_matrix')
        );
        setAgreement(agreementKey ? data.report.extras[agreementKey] : '');
      } else {
        setAgreement('');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load report');
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    loadStatus().then(() => loadReport(week));
  }, [loadStatus, loadReport, week]);

  const runAgent = async () => {
    if (!canRunOnServer) {
      setError('Run Agent needs Python on the server. Use GitHub Actions, then click Reload to view output.');
      return;
    }

    setRunning(true);
    setError('');
    try {
      const data = await apiFetch<AgentRunResponse>(`/api/agents/${agentId}/run`, {
        method: 'POST',
        body: JSON.stringify({ week }),
      });
      if (data.report) {
        setReport({
          filename: data.report.filename,
          markdown: data.report.markdown,
          bias: data.bias ?? undefined,
          extras: data.report.extras,
        });
        setLastBias(data.bias ?? null);
        setReportSource(SOURCE_LABELS.scripts_output);
      } else {
        await loadReport(week);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Agent run failed');
    } finally {
      setRunning(false);
    }
  };

  const runFullPipeline = async () => {
    if (!canRunOnServer) {
      setError('Run Full Pipeline needs Python on the server. Trigger GitHub Actions in CP3405_Group_4 instead.');
      return;
    }

    setRunningAll(true);
    setError('');
    try {
      await apiFetch('/api/agents/pipeline/run-all', {
        method: 'POST',
        body: JSON.stringify({ week }),
      });
      await loadReport(week);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Full pipeline failed');
    } finally {
      setRunningAll(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-xl border border-border-subtle bg-surface-raised p-16 text-sm text-text-muted">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading {title}...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border-subtle bg-surface-raised p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold">{title}</p>
            <p className="mt-1 max-w-2xl text-xs text-text-muted">{description}</p>
            <p className="mt-2 text-[11px] text-text-muted">
              Project week: <span className="font-mono text-text-secondary">W{week}</span>
              {canViewFromGitHub && status?.evidenceRepo
                ? ` · Evidence repo: ${status.evidenceRepo}`
                : ''}
            </p>
            {!canRunOnServer && (
              <p className="mt-2 max-w-xl text-[11px] text-text-secondary">
                Reports auto-update weekly via GitHub Actions in{' '}
                <span className="font-mono">CP3405_Group_4</span>. This page loads the latest
                saved markdown — no GitHub token needed. Click Reload after each workflow run.
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-xs text-text-muted">
              Week
              {availableWeeks.length > 0 ? (
                <select
                  value={week}
                  onChange={(e) => setWeek(Number(e.target.value))}
                  className="rounded-md border border-border bg-surface px-2 py-1 font-mono text-sm"
                >
                  {availableWeeks.map((w) => (
                    <option key={w} value={w}>
                      W{w}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="number"
                  min={1}
                  max={53}
                  value={week}
                  onChange={(e) => setWeek(Number(e.target.value) || 1)}
                  className="w-16 rounded-md border border-border bg-surface px-2 py-1 font-mono text-sm"
                />
              )}
            </label>

            <button
              type="button"
              onClick={() => loadReport(week)}
              className="flex items-center gap-1.5 rounded-lg border border-border-subtle px-3 py-2 text-xs text-text-secondary hover:bg-surface-overlay"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Reload
            </button>

            {canRunOnServer && (
              <>
                <button
                  type="button"
                  onClick={runAgent}
                  disabled={running || runningAll}
                  className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
                >
                  {running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                  Run Agent
                </button>

                {showFullPipeline && (
                  <button
                    type="button"
                    onClick={runFullPipeline}
                    disabled={running || runningAll}
                    className="flex items-center gap-1.5 rounded-lg border border-accent/40 bg-accent/10 px-3 py-2 text-xs font-medium text-accent disabled:opacity-50"
                  >
                    {runningAll ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
                    Run Full Pipeline
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {lastBias && (
          <div className="mt-4 inline-flex rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
            Latest bias: {lastBias}
          </div>
        )}
      </div>

      {error && (
        <p className="rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-xs text-warning">
          {error}
        </p>
      )}

      {children}

      {report ? (
        <div className="rounded-xl border border-border-subtle bg-surface-raised p-6">
          <div className="mb-4 flex items-center justify-between gap-3 border-b border-border-subtle pb-4">
            <div>
              <h3 className="text-sm font-semibold">Generated Report</h3>
              <p className="text-[11px] text-text-muted">{report.filename}</p>
              {reportSource && (
                <p className="mt-1 text-[11px] text-accent">{reportSource}</p>
              )}
            </div>
          </div>
          <MarkdownContent content={report.markdown} />
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border-subtle bg-surface-raised p-12 text-center">
          <p className="text-sm text-text-secondary">No report yet for week {week}</p>
          <p className="mt-1 text-xs text-text-muted">
            {emptyMessage ||
              (canRunOnServer
                ? 'Click Run Agent to generate the report'
                : 'Run GitHub Actions in CP3405_Group_4, then click Reload')}
          </p>
        </div>
      )}

      {agentId === 'llm' && agreement && (
        <div className="rounded-xl border border-border-subtle bg-surface-raised p-6">
          <h3 className="mb-4 text-sm font-semibold">Agreement Matrix</h3>
          <MarkdownContent content={agreement} />
        </div>
      )}
    </div>
  );
}
