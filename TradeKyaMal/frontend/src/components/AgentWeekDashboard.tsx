'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronDown, Loader2, RefreshCw } from 'lucide-react';
import clsx from 'clsx';
import { MarkdownContent } from '@/components/MarkdownContent';
import { CalibrationPanel } from '@/components/CalibrationPanel';
import { HumanScorePanel } from '@/components/HumanScorePanel';
import {
  fetchPipelineStatus,
  formatRelativeTime,
  getProjectWeek,
  loadWeekDashboard,
} from '@/lib/evidenceClient';
import type { AgentType, WeekDashboardData } from '@/lib/types';

interface AgentWeekDashboardProps {
  agentFilter?: AgentType | AgentType[];
  showFinalHero?: boolean;
}

function biasTone(bias: string | null): string {
  if (!bias) return 'text-text-muted';
  const value = bias.toLowerCase();
  if (value.includes('bear')) return 'text-negative';
  if (value.includes('bull')) return 'text-positive';
  return 'text-text-primary';
}

function pctColor(value: number): string {
  if (value > 0) return 'text-positive';
  if (value < 0) return 'text-negative';
  return 'text-text-muted';
}

function SectorBar({ name, symbol, pct }: { name: string; symbol: string; pct: number }) {
  const width = Math.min(Math.abs(pct) * 8, 100);
  const color = pct >= 0 ? 'bg-positive' : 'bg-negative';

  return (
    <div className="flex items-center gap-3">
      <div className="w-32 shrink-0">
        <p className="text-xs font-medium">{name}</p>
        <p className="font-mono text-[10px] text-text-muted">{symbol}</p>
      </div>
      <div className="relative h-6 flex-1 overflow-hidden rounded bg-surface">
        <div
          className={`absolute left-0 top-0 h-full ${color} opacity-80`}
          style={{ width: `${width}%` }}
        />
      </div>
      <span className={`w-14 text-right font-mono text-xs ${pctColor(pct)}`}>
        {pct >= 0 ? '+' : ''}
        {pct.toFixed(2)}%
      </span>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | null;
  sub?: string | null;
}) {
  return (
    <div className="rounded-xl border border-border-subtle bg-surface-raised p-5">
      <p className="text-xs font-medium uppercase tracking-wider text-text-muted">{label}</p>
      <p className={clsx('mt-2 text-lg font-semibold leading-snug', biasTone(value))}>
        {value ?? '—'}
      </p>
      {sub && <p className="mt-1 text-xs text-text-secondary">{sub}</p>}
    </div>
  );
}

function ChartGrid({
  title,
  charts,
}: {
  title: string;
  charts: Array<{ label: string; url: string }>;
}) {
  if (charts.length === 0) return null;

  return (
    <section className="rounded-xl border border-border-subtle bg-surface-raised p-5">
      <h3 className="mb-4 text-sm font-semibold">{title}</h3>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {charts.map((chart) => (
          <div key={chart.url} className="overflow-hidden rounded-lg border border-border-subtle bg-surface">
            <div className="border-b border-border-subtle px-3 py-2 text-xs font-medium text-text-secondary">
              {chart.label}
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={chart.url} alt={chart.label} className="w-full bg-white" />
          </div>
        ))}
      </div>
    </section>
  );
}

function ReportAccordion({
  title,
  markdown,
}: {
  title: string;
  markdown: string | null;
}) {
  const [open, setOpen] = useState(false);
  if (!markdown) return null;

  return (
    <section className="overflow-hidden rounded-xl border border-border-subtle bg-surface-raised">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between px-5 py-4 text-left"
      >
        <span className="text-sm font-semibold">{title}</span>
        <ChevronDown className={clsx('h-4 w-4 text-text-muted transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="border-t border-border-subtle px-5 py-4">
          <MarkdownContent content={markdown} />
        </div>
      )}
    </section>
  );
}

export function AgentWeekDashboard({
  agentFilter,
  showFinalHero = !agentFilter,
}: AgentWeekDashboardProps) {
  const [week, setWeek] = useState<number | null>(null);
  const [availableWeeks, setAvailableWeeks] = useState<number[]>([]);
  const [data, setData] = useState<WeekDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDashboard = useCallback(async (targetWeek: number) => {
    setLoading(true);
    setError('');
    try {
      const dashboard = await loadWeekDashboard(targetWeek, agentFilter);
      setData(dashboard);
      setAvailableWeeks(dashboard.availableWeeks);
    } catch {
      setError('Could not load weekly dashboard.');
    } finally {
      setLoading(false);
    }
  }, [agentFilter]);

  useEffect(() => {
    fetchPipelineStatus().then((status) => {
      setWeek(status.defaultWeek);
      setAvailableWeeks(status.availableWeeks ?? []);
    });
  }, []);

  useEffect(() => {
    if (week === null) return;
    loadDashboard(week);
  }, [week, loadDashboard]);

  const hasAgentData = Boolean(
    data?.agents.some((agent) => agent.bias || agent.reportMarkdown)
  );
  const calendarWeek = getProjectWeek();
  const latestEvidenceWeek = availableWeeks[0] ?? null;

  const showTechnical = useMemo(() => {
    if (!agentFilter) return true;
    const filters = Array.isArray(agentFilter) ? agentFilter : [agentFilter];
    return filters.includes('technical');
  }, [agentFilter]);

  const showMacro = useMemo(() => {
    if (!agentFilter) return true;
    const filters = Array.isArray(agentFilter) ? agentFilter : [agentFilter];
    return filters.includes('macro');
  }, [agentFilter]);

  const showAlmanac = useMemo(() => {
    if (!agentFilter) return true;
    const filters = Array.isArray(agentFilter) ? agentFilter : [agentFilter];
    return filters.includes('almanac');
  }, [agentFilter]);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-xl border border-border-subtle bg-surface-raised p-16 text-sm text-text-muted">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading dashboard...
      </div>
    );
  }

  if (week === null) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border-subtle bg-surface-raised px-5 py-4">
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-text-muted">
            Week
            <select
              value={week}
              onChange={(e) => setWeek(Number(e.target.value))}
              className="rounded-md border border-border bg-surface px-2 py-1 font-mono text-sm"
            >
              {(availableWeeks.length ? availableWeeks : [week]).map((value) => (
                <option key={value} value={value}>
                  W{value}
                </option>
              ))}
            </select>
          </label>
          {calendarWeek !== week && (
            <span className="text-xs text-text-muted">
              Calendar week W{calendarWeek} · showing latest evidence W{week}
            </span>
          )}
          {data?.updatedAt && (
            <span className="text-xs text-text-muted">
              Updated {formatRelativeTime(data.updatedAt)}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => loadDashboard(week)}
          className="flex items-center gap-1.5 rounded-lg border border-border-subtle px-3 py-2 text-xs text-text-secondary hover:bg-surface-overlay"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </button>
      </div>

      {error && (
        <p className="rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-xs text-warning">
          {error}
        </p>
      )}

      {!hasAgentData && !loading && (
        <div className="rounded-xl border border-dashed border-border-subtle bg-surface-raised p-10 text-center">
          <p className="text-sm text-text-secondary">No reports for week {week} yet.</p>
          <p className="mt-2 text-xs text-text-muted">
            GitHub Actions runs every Saturday ~4 AM SGT.
            {latestEvidenceWeek && latestEvidenceWeek !== week
              ? ` Select W${latestEvidenceWeek} for the latest data.`
              : ' Check back after the next pipeline run.'}
          </p>
        </div>
      )}

      {showFinalHero && data?.finalBias && (
        <div className="grid gap-4 lg:grid-cols-3">
          <SummaryCard label="Final Market Bias" value={data.finalBias} />
          <SummaryCard label="Confidence" value={data.finalConfidence} />
          <SummaryCard label="Model Score" value={data.modelScore} />
        </div>
      )}

      {data && data.agents.length > 0 && (
        <section>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-text-muted">
            Agent Summary
          </h3>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {data.agents
              .filter((agent) => agent.id !== 'final')
              .map((agent) => (
                <SummaryCard
                  key={agent.id}
                  label={agent.label}
                  value={agent.bias}
                  sub={agent.confidence ? `Confidence: ${agent.confidence}` : undefined}
                />
              ))}
          </div>
        </section>
      )}

      {showFinalHero && data && data.sourceRows.length > 0 && (
        <section className="rounded-xl border border-border-subtle bg-surface-raised p-5">
          <h3 className="mb-4 text-sm font-semibold">Source Summary</h3>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-border-subtle text-xs uppercase tracking-wide text-text-muted">
                  <th className="px-3 py-2">Source</th>
                  <th className="px-3 py-2">Bias</th>
                  <th className="px-3 py-2">Confidence</th>
                  <th className="px-3 py-2">Driver</th>
                </tr>
              </thead>
              <tbody>
                {data.sourceRows.map((row) => (
                  <tr key={row.source} className="border-b border-border-subtle/60">
                    <td className="px-3 py-2 font-medium">{row.source}</td>
                    <td className={clsx('px-3 py-2', biasTone(row.bias))}>{row.bias}</td>
                    <td className="px-3 py-2 text-text-secondary">{row.confidence}</td>
                    <td className="px-3 py-2 text-text-secondary">{row.driver ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {showAlmanac && data && data.indexRows.length > 0 && (
        <section className="rounded-xl border border-border-subtle bg-surface-raised p-5">
          <h3 className="mb-4 text-sm font-semibold">Market Snapshot</h3>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {data.indexRows.map((row) => (
              <div key={row.asset} className="rounded-lg border border-border-subtle bg-surface px-4 py-3">
                <p className="text-xs text-text-muted">{row.asset}</p>
                <p className={clsx('mt-1 font-mono text-sm font-semibold', biasTone(row.signal))}>
                  {row.change}
                </p>
                <p className="mt-1 text-[11px] text-text-secondary">{row.signal}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {showMacro && data && data.sectors.length > 0 && (
        <section className="rounded-xl border border-border-subtle bg-surface-raised p-5">
          <h3 className="mb-4 text-sm font-semibold">Sector Performance</h3>
          <div className="space-y-3">
            {data.sectors.slice(0, 11).map((sector) => (
              <SectorBar
                key={sector.symbol}
                name={sector.name}
                symbol={sector.symbol}
                pct={sector.pct}
              />
            ))}
          </div>
        </section>
      )}

      {showTechnical && data && (
        <ChartGrid title="Technical Charts" charts={data.technicalCharts} />
      )}

      {showMacro && data && (
        <ChartGrid title="Macro Charts" charts={data.macroCharts} />
      )}

      {showFinalHero && data && data.risks.length > 0 && (
        <section className="rounded-xl border border-border-subtle bg-surface-raised p-5">
          <h3 className="mb-3 text-sm font-semibold">Key Risks</h3>
          <ul className="space-y-2 text-sm text-text-secondary">
            {data.risks.map((risk) => (
              <li key={risk} className="flex gap-2">
                <span className="text-accent">•</span>
                <span>{risk}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {showFinalHero && data?.agents.find((a) => a.id === 'final')?.reportMarkdown && (
        <ReportAccordion
          title="Final Prediction Report"
          markdown={data.agents.find((a) => a.id === 'final')?.reportMarkdown ?? null}
        />
      )}

      {showFinalHero && data && (
        <>
          <HumanScorePanel week={week} githubMarkdown={data.humanScoreMarkdown} />
          <CalibrationPanel
            calibrationLog={data.calibrationLog}
            learningLog={data.learningLog}
            llmHorserace={data.llmHorserace}
            pastAccuracyLog={data.pastAccuracyLog}
          />
        </>
      )}

      {data?.agreementMarkdown && (
        <ReportAccordion title="Agreement Matrix" markdown={data.agreementMarkdown} />
      )}

      {data?.agents
        .filter((agent) => agent.id !== 'final')
        .map((agent) => (
        <ReportAccordion
          key={agent.id}
          title={`${agent.label} Report`}
          markdown={agent.reportMarkdown}
        />
      ))}
    </div>
  );
}
