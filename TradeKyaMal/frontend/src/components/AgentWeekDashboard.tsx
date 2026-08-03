'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronDown, Loader2, RefreshCw } from 'lucide-react';
import clsx from 'clsx';
import { MarkdownContent } from '@/components/MarkdownContent';
import { CalibrationPanel } from '@/components/CalibrationPanel';
import { HumanScorePanel } from '@/components/HumanScorePanel';
import { FinalPredictionHero } from '@/components/FinalPredictionHero';
import { Panel, SectionHeader } from '@/components/Panel';
import {
  fetchPipelineStatus,
  formatRelativeTime,
  getProjectWeek,
  loadWeekDashboard,
} from '@/lib/evidenceClient';
import type { AgentType, WeekDashboardData } from '@/lib/types';

export type DashboardView = 'overview' | 'agent' | 'llm' | 'final' | 'review' | 'human-score';

interface AgentWeekDashboardProps {
  agentFilter?: AgentType | AgentType[];
  view?: DashboardView;
}

function resolveView(
  agentFilter: AgentType | AgentType[] | undefined,
  view: DashboardView | undefined
): DashboardView {
  if (view) return view;
  if (!agentFilter) return 'overview';
  const filters = Array.isArray(agentFilter) ? agentFilter : [agentFilter];
  if (filters.length === 1 && filters[0] === 'llm') return 'llm';
  return 'agent';
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

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-4 text-sm font-semibold tracking-tight">{children}</h3>;
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
  highlight,
}: {
  label: string;
  value: string | null;
  sub?: string | null;
  highlight?: boolean;
}) {
  return (
    <div
      className={clsx(
        'rounded-2xl border p-5 shadow-sm shadow-black/10',
        highlight
          ? 'border-accent/30 bg-accent/5'
          : 'border-border-subtle bg-surface-raised/80'
      )}
    >
      <p className="text-xs font-medium text-text-muted">{label}</p>
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
    <Panel>
      <SectionHeader title={title} />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {charts.map((chart) => (
          <div key={chart.url} className="overflow-hidden rounded-xl border border-border-subtle bg-surface">
            <div className="border-b border-border-subtle px-3 py-2 text-xs font-medium text-text-secondary">
              {chart.label}
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={chart.url} alt={chart.label} className="w-full bg-white" />
          </div>
        ))}
      </div>
    </Panel>
  );
}

function ReportAccordion({
  title,
  markdown,
  defaultOpen = false,
}: {
  title: string;
  markdown: string | null;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  if (!markdown) return null;

  return (
    <section className="overflow-hidden rounded-2xl border border-border-subtle bg-surface-raised/80 shadow-sm shadow-black/10">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-surface-overlay/50"
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

function WeekToolbar({
  week,
  availableWeeks,
  currentProjectWeek,
  latestEvidenceWeek,
  updatedAt,
  onWeekChange,
  onRefresh,
}: {
  week: number;
  availableWeeks: number[];
  currentProjectWeek: number;
  latestEvidenceWeek: number | null;
  updatedAt: string | null | undefined;
  onWeekChange: (week: number) => void;
  onRefresh: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border-subtle bg-surface-raised/80 px-5 py-4 shadow-sm shadow-black/10">
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm">
          <span className="text-text-muted">Week</span>
          <select
            value={week}
            onChange={(e) => onWeekChange(Number(e.target.value))}
            className="rounded-lg border border-border bg-surface px-3 py-1.5 font-mono text-sm focus:border-accent/50 focus:outline-none"
          >
            {(availableWeeks.length ? availableWeeks : [week]).map((value) => (
              <option key={value} value={value}>
                W{value}{value === currentProjectWeek ? ' (current)' : ''}
              </option>
            ))}
          </select>
        </label>
        {latestEvidenceWeek && week !== latestEvidenceWeek && (
          <span className="text-xs text-text-muted">Latest: W{latestEvidenceWeek}</span>
        )}
        {updatedAt && (
          <span className="text-xs text-text-muted">
            Updated {formatRelativeTime(updatedAt)}
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={onRefresh}
        className="flex items-center gap-1.5 rounded-lg border border-border-subtle bg-surface px-3 py-2 text-xs font-medium text-text-secondary transition-colors hover:border-accent/30 hover:text-text-primary"
      >
        <RefreshCw className="h-3.5 w-3.5" />
        Refresh
      </button>
    </div>
  );
}

export function AgentWeekDashboard({ agentFilter, view: viewProp }: AgentWeekDashboardProps) {
  const view = resolveView(agentFilter, viewProp);

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
      const current = status.projectWeek;
      const weeks = status.availableWeeks ?? [];
      const defaultWeek = weeks.includes(current) ? current : status.defaultWeek;
      setWeek(defaultWeek);
      setAvailableWeeks(weeks);
    });
  }, []);

  useEffect(() => {
    if (week === null) return;
    loadDashboard(week);
  }, [week, loadDashboard]);

  const filters = useMemo(
    () => (agentFilter ? (Array.isArray(agentFilter) ? agentFilter : [agentFilter]) : []),
    [agentFilter]
  );

  const showTechnical = view === 'overview' || filters.includes('technical');
  const showMacro = view === 'overview' || filters.includes('macro');
  const showAlmanac = view === 'overview' || filters.includes('almanac');

  const hasAgentData = Boolean(
    data?.agents.some((agent) => agent.bias || agent.reportMarkdown)
  );
  const latestEvidenceWeek = availableWeeks[0] ?? null;
  const currentProjectWeek = getProjectWeek();
  const finalAgent = data?.agents.find((a) => a.id === 'final');

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-2xl border border-border-subtle bg-surface-raised/80 p-16 text-sm text-text-muted">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading...
      </div>
    );
  }

  if (week === null) {
    return null;
  }

  return (
    <div className="space-y-6">
      <WeekToolbar
        week={week}
        availableWeeks={availableWeeks}
        currentProjectWeek={currentProjectWeek}
        latestEvidenceWeek={latestEvidenceWeek}
        updatedAt={data?.updatedAt}
        onWeekChange={setWeek}
        onRefresh={() => loadDashboard(week)}
      />

      {error && (
        <p className="rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-xs text-warning">
          {error}
        </p>
      )}

      {!hasAgentData && !loading && view !== 'review' && view !== 'human-score' && (
        <div className="rounded-xl border border-dashed border-border-subtle bg-surface-raised p-10 text-center text-sm text-text-secondary">
          No reports for W{week} yet.
          {latestEvidenceWeek && latestEvidenceWeek !== week && (
            <span className="text-text-muted"> Try W{latestEvidenceWeek}.</span>
          )}
        </div>
      )}

      {/* ── Overview ── */}
      {view === 'overview' && data && (
        <>
          {data.finalBias && (
            <FinalPredictionHero
              week={week}
              bias={data.finalBias}
              confidence={data.finalConfidence}
              modelScore={data.modelScore}
            />
          )}

          {data.agents.length > 0 && (
            <section>
              <SectionTitle>Agent Signals</SectionTitle>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {data.agents
                  .filter((agent) => agent.id !== 'final')
                  .map((agent) => (
                    <SummaryCard
                      key={agent.id}
                      label={agent.label}
                      value={agent.bias}
                      sub={agent.confidence ?? undefined}
                    />
                  ))}
              </div>
            </section>
          )}

          {showAlmanac && data.indexRows.length > 0 && (
            <section className="rounded-xl border border-border-subtle bg-surface-raised p-5">
              <SectionTitle>Market Snapshot</SectionTitle>
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

          {showMacro && data.sectors.length > 0 && (
            <Panel>
              <SectionTitle>Sector Performance</SectionTitle>
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
            </Panel>
          )}

          {showTechnical && <ChartGrid title="Technical Charts" charts={data.technicalCharts} />}
          {showMacro && <ChartGrid title="Macro Charts" charts={data.macroCharts} />}
        </>
      )}

      {/* ── Agent (single agent tabs) ── */}
      {view === 'agent' && data && (
        <>
          {filters.length === 1 && filters[0] === 'final' && (
            <FinalPredictionHero
              week={week}
              bias={data.finalBias}
              confidence={data.finalConfidence}
              modelScore={data.modelScore}
            />
          )}

          {data.agents.length > 0 && (
            <section>
              <SectionTitle>{filters[0] === 'final' ? 'Outlook' : 'Signal'}</SectionTitle>
              <div className="grid gap-4 sm:grid-cols-2">
                {data.agents.map((agent) => (
                  <SummaryCard
                    key={agent.id}
                    label={agent.label}
                    value={agent.bias ?? data.finalBias}
                    sub={
                      (agent.confidence ?? data.finalConfidence)
                        ? `Confidence: ${agent.confidence ?? data.finalConfidence}`
                        : undefined
                    }
                    highlight
                  />
                ))}
              </div>
            </section>
          )}

          {filters.length === 1 && filters[0] === 'final' && data.sourceRows.length > 0 && (
            <div className="rounded-xl border border-border-subtle bg-surface-raised p-5">
              <SectionTitle>Source Breakdown</SectionTitle>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-border-subtle text-xs text-text-muted">
                      <th className="px-3 py-2 font-medium">Source</th>
                      <th className="px-3 py-2 font-medium">Bias</th>
                      <th className="px-3 py-2 font-medium">Confidence</th>
                      <th className="px-3 py-2 font-medium">Driver</th>
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
            </div>
          )}

          {filters.length === 1 && filters[0] === 'final' && data.risks.length > 0 && (
            <section className="rounded-xl border border-border-subtle bg-surface-raised p-5">
              <SectionTitle>Key Risks</SectionTitle>
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

          {showAlmanac && data.indexRows.length > 0 && (
            <section className="rounded-xl border border-border-subtle bg-surface-raised p-5">
              <SectionTitle>Market Snapshot</SectionTitle>
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

          {showMacro && data.sectors.length > 0 && (
            <Panel>
              <SectionTitle>Sector Performance</SectionTitle>
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
            </Panel>
          )}

          {showTechnical && <ChartGrid title="Technical Charts" charts={data.technicalCharts} />}
          {showMacro && <ChartGrid title="Macro Charts" charts={data.macroCharts} />}

          {data.agents.map((agent) => (
              <ReportAccordion
                key={agent.id}
                title={`${agent.label} Report`}
                markdown={agent.reportMarkdown}
                defaultOpen
              />
            ))}
        </>
      )}

      {/* ── LLM ── */}
      {view === 'llm' && data && (
        <>
          {data.agents
            .filter((agent) => agent.id === 'llm')
            .map((agent) => (
              <SummaryCard
                key={agent.id}
                label={agent.label}
                value={agent.bias}
                sub={agent.confidence ?? undefined}
                highlight
              />
            ))}

          {data.agreementMarkdown && (
            <ReportAccordion title="Agreement Matrix" markdown={data.agreementMarkdown} defaultOpen />
          )}

          {data.agents
            .filter((agent) => agent.id === 'llm')
            .map((agent) => (
              <ReportAccordion
                key={agent.id}
                title="LLM Synthesis Report"
                markdown={agent.reportMarkdown}
              />
            ))}
        </>
      )}

      {/* ── Final Prediction ── */}
      {view === 'final' && data && (
        <>
          <FinalPredictionHero
            week={week}
            bias={data.finalBias}
            confidence={data.finalConfidence}
            modelScore={data.modelScore}
          />

          {data.sourceRows.length > 0 && (
            <div className="rounded-xl border border-border-subtle bg-surface-raised p-5">
              <SectionTitle>Source Breakdown</SectionTitle>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-border-subtle text-xs text-text-muted">
                      <th className="px-3 py-2 font-medium">Source</th>
                      <th className="px-3 py-2 font-medium">Bias</th>
                      <th className="px-3 py-2 font-medium">Confidence</th>
                      <th className="px-3 py-2 font-medium">Driver</th>
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
            </div>
          )}

          {data.risks.length > 0 && (
            <section className="rounded-xl border border-border-subtle bg-surface-raised p-5">
              <SectionTitle>Key Risks</SectionTitle>
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

          {finalAgent?.reportMarkdown && (
            <ReportAccordion
              title="Full Report"
              markdown={finalAgent.reportMarkdown}
              defaultOpen
            />
          )}
        </>
      )}

      {/* ── Human Score ── */}
      {view === 'human-score' && data && (
        <HumanScorePanel
          week={week}
          githubMarkdown={data.humanScoreMarkdown}
          agentBiases={Object.fromEntries(
            data.agents
              .filter((a) => a.id !== 'final')
              .map((a) => [a.id, a.bias])
          )}
        />
      )}

      {/* ── Calibration Review ── */}
      {view === 'review' && data && (
        <CalibrationPanel
          calibrationLog={data.calibrationLog}
          learningLog={data.learningLog}
          llmHorserace={data.llmHorserace}
          pastAccuracyLog={data.pastAccuracyLog}
        />
      )}
    </div>
  );
}
